import mongoose from "mongoose";
import Product from "../models/Product.js";
import ProductBatch from "../models/ProductBatch.js";
import InventoryTransaction from "../models/InventoryTransaction.js";
import { generateProductBarcode } from "../utils/barcode.js";
import { uploadImageBuffer, deleteImage } from "../utils/cloudinaryUpload.js";
import { serializeProduct, serializeBatch } from "../utils/serialize.js";

export const createProduct = async (req, res) => {
  try {
    const {
      product_name,
      sku,
      category_id,
      cost_price,
      sale_price,
      stock_quantity,
      unit,
      status,
      barcode,
      description,
      variants,
    } = req.body;

    // Optional phone-model variants: [{ model, quantity }], each tracked as
    // its own stock line (a product batch named after the model).
    const variantList = Array.isArray(variants)
      ? variants
          .map((v) => ({
            model: String(v?.model ?? "").trim(),
            quantity: Number(v?.quantity ?? 0),
          }))
          .filter((v) => v.model)
      : [];
    const hasVariants = variantList.length > 0;

    if (
      !product_name ||
      !category_id ||
      cost_price === undefined ||
      sale_price === undefined ||
      (!hasVariants && stock_quantity === undefined) ||
      !unit ||
      !status
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
    }

    const parsedCostPrice = Number(cost_price);
    const parsedSalePrice = Number(sale_price);
    // With variants, stock lives on the variants, not on the product itself
    const parsedStockQuantity = hasVariants ? 0 : Number(stock_quantity);

    const variantNames = new Set(variantList.map((v) => v.model.toLowerCase()));
    if (variantNames.size !== variantList.length) {
      return res.status(400).json({
        success: false,
        message: "Each phone model can only be listed once",
      });
    }
    if (
      variantList.some(
        (v) =>
          Number.isNaN(v.quantity) || v.quantity < 0 || !Number.isInteger(v.quantity),
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Variant quantities must be whole numbers, 0 or more",
      });
    }

    if (
      Number.isNaN(parsedCostPrice) ||
      Number.isNaN(parsedSalePrice) ||
      Number.isNaN(parsedStockQuantity)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Cost price, sale price, and stock quantity must be valid numbers",
      });
    }

    if (parsedCostPrice < 0 || parsedSalePrice < 0 || parsedStockQuantity < 0) {
      return res.status(400).json({
        success: false,
        message: "Prices and stock quantity cannot be negative",
      });
    }

    if (!["Active", "Inactive"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product status",
      });
    }

    const trimmedBarcode = barcode ? barcode.trim() : null;
    const trimmedSku = sku ? String(sku).trim() : "";

    const existingProduct = await Product.findOne({
      $or: [
        ...(trimmedSku ? [{ sku: trimmedSku }] : []),
        { productName: product_name.trim() },
        ...(trimmedBarcode ? [{ barcode: trimmedBarcode }] : []),
      ],
    });

    if (existingProduct) {
      return res.status(409).json({
        success: false,
        message: "Product with same SKU, name or barcode already exists",
      });
    }

    const finalBarcode = trimmedBarcode || (await generateProductBarcode());
    // SKU is optional in the form; fall back to one derived from the barcode
    const finalSku = trimmedSku || `SKU-${finalBarcode}`;

    const newProduct = await Product.create({
      productName: product_name.trim(),
      sku: finalSku,
      categoryId: category_id,
      costPrice: parsedCostPrice,
      salePrice: parsedSalePrice,
      unit: unit.trim(),
      status,
      barcode: finalBarcode,
      description: description ? description.trim() : "",
      stock: {
        currentStock: parsedStockQuantity,
        reorderLevel: parsedStockQuantity,
        reorderQuantity: 0,
        lastRestockedAt: new Date(),
      },
      costs: {
        holdingCostPerUnit: 0,
        storageCost: 0,
        insuranceCost: 0,
        spoilageRate: 0,
      },
    });

    if (hasVariants) {
      for (const variant of variantList) {
        const batch = await ProductBatch.create({
          productId: newProduct._id,
          batchNumber: variant.model,
          quantity: variant.quantity,
          costPrice: parsedCostPrice,
          salePrice: parsedSalePrice,
        });

        if (variant.quantity > 0) {
          await InventoryTransaction.create({
            productId: newProduct._id,
            batchId: batch._id,
            type: "IN",
            quantity: variant.quantity,
            referenceType: "CREATE_BATCH",
          });
        }
      }
    } else {
      await InventoryTransaction.create({
        productId: newProduct._id,
        type: "IN",
        quantity: parsedStockQuantity,
        referenceType: "INITIAL_STOCK",
      });
    }

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: serializeProduct(newProduct),
    });
  } catch (error) {
    console.error("Create product error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid product ID" });
    }

    const existingProduct = await Product.findById(id);

    if (!existingProduct) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const {
      product_name,
      sku,
      category_id,
      cost_price,
      sale_price,
      stock_quantity,
      unit,
      status,
      barcode,
      description,
    } = req.body;

    if (barcode) {
      const trimmedBarcode = barcode.trim();
      const existingWithSameBarcode = await Product.findOne({
        barcode: trimmedBarcode,
        _id: { $ne: id },
      });

      if (existingWithSameBarcode) {
        return res.status(409).json({
          success: false,
          message: "Product with same barcode already exists",
        });
      }
    }

    const updatedProductName =
      product_name !== undefined ? product_name : existingProduct.productName;
    const updatedSku =
      sku !== undefined && String(sku).trim() ? String(sku) : existingProduct.sku;
    const updatedCategory =
      category_id !== undefined && category_id !== ""
        ? category_id
        : existingProduct.categoryId;
    const updatedCostPrice =
      cost_price !== undefined && cost_price !== ""
        ? Number(cost_price)
        : Number(existingProduct.costPrice);
    const updatedSalePrice =
      sale_price !== undefined && sale_price !== ""
        ? Number(sale_price)
        : Number(existingProduct.salePrice);
    const updatedStockQuantity =
      stock_quantity !== undefined && stock_quantity !== ""
        ? Number(stock_quantity)
        : Number(existingProduct.stock?.currentStock || 0);
    const updatedUnit = unit !== undefined ? unit : existingProduct.unit;
    const updatedStatus = status !== undefined ? status : existingProduct.status;
    const updatedBarcode =
      barcode !== undefined ? barcode || null : existingProduct.barcode;
    const updatedDescription =
      description !== undefined ? description || "" : existingProduct.description;

    if (!updatedProductName?.trim()) {
      return res.status(400).json({ success: false, message: "Product name is required" });
    }
    if (!updatedSku?.trim()) {
      return res.status(400).json({ success: false, message: "SKU is required" });
    }
    if (Number.isNaN(updatedCostPrice) || updatedCostPrice < 0) {
      return res.status(400).json({ success: false, message: "Invalid cost price" });
    }
    if (Number.isNaN(updatedSalePrice) || updatedSalePrice < 0) {
      return res.status(400).json({ success: false, message: "Invalid sale price" });
    }
    if (Number.isNaN(updatedStockQuantity) || updatedStockQuantity < 0) {
      return res.status(400).json({ success: false, message: "Invalid stock quantity" });
    }
    if (!["Active", "Inactive"].includes(updatedStatus)) {
      return res.status(400).json({ success: false, message: "Invalid product status" });
    }

    const existingStock = Number(existingProduct.stock?.currentStock || 0);
    const quantityChange = Math.abs(updatedStockQuantity - existingStock);

    existingProduct.productName = updatedProductName.trim();
    existingProduct.sku = updatedSku.trim();
    existingProduct.categoryId = updatedCategory;
    existingProduct.costPrice = updatedCostPrice;
    existingProduct.salePrice = updatedSalePrice;
    existingProduct.unit = updatedUnit;
    existingProduct.status = updatedStatus;
    existingProduct.barcode = updatedBarcode;
    existingProduct.description = updatedDescription;
    existingProduct.stock.currentStock = updatedStockQuantity;

    await existingProduct.save();

    if (quantityChange > 0) {
      await InventoryTransaction.create({
        productId: existingProduct._id,
        type: updatedStockQuantity > existingStock ? "IN" : "OUT",
        quantity: quantityChange,
        referenceType: "ADJUSTMENT",
        referenceId: existingProduct._id,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: serializeProduct(existingProduct),
    });
  } catch (error) {
    console.error("Update product error:", error.message);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid product ID" });
    }

    const existingProduct = await Product.findOne({ _id: id, isDeleted: false });

    if (!existingProduct) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const currentStock = Number(existingProduct.stock?.currentStock || 0);

    if (currentStock > 0) {
      await InventoryTransaction.create({
        productId: existingProduct._id,
        type: "OUT",
        quantity: currentStock,
        referenceType: "PRODUCT_DELETED",
        referenceId: existingProduct._id,
      });
    }

    const batches = await ProductBatch.find({ productId: existingProduct._id });

    for (const batch of batches) {
      if (Number(batch.quantity) > 0) {
        await InventoryTransaction.create({
          productId: existingProduct._id,
          batchId: batch._id,
          type: "OUT",
          quantity: batch.quantity,
          referenceType: "PRODUCT_DELETED",
          referenceId: batch._id,
        });
        batch.quantity = 0;
        await batch.save();
      }
    }

    existingProduct.stock.currentStock = 0;
    existingProduct.isDeleted = true;
    existingProduct.deletedAt = new Date();
    await existingProduct.save();

    return res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error("Delete product error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

async function attachBatches(products) {
  if (products.length === 0) return [];

  const productIds = products.map((p) => p._id);
  const batches = await ProductBatch.find({
    productId: { $in: productIds },
    isDeleted: false,
  }).sort({ createdAt: -1 });

  const batchesByProduct = new Map();
  for (const batch of batches) {
    const key = String(batch.productId);
    if (!batchesByProduct.has(key)) batchesByProduct.set(key, []);
    batchesByProduct.get(key).push(serializeBatch(batch));
  }

  return products.map((product) => ({
    ...serializeProduct(product),
    batches: batchesByProduct.get(String(product._id)) || [],
  }));
}

export const getProducts = async (req, res) => {
  try {
    const { page, limit, search, category, status } = req.query;

    const pageNum = Math.max(parseInt(page) || 1, 1);
    const limitNum = Math.max(parseInt(limit) || 10, 1);
    const offset = (pageNum - 1) * limitNum;

    const filter = { isDeleted: false };

    if (search) {
      filter.$or = [
        { productName: { $regex: search, $options: "i" } },
        { sku: { $regex: search, $options: "i" } },
        { barcode: { $regex: search, $options: "i" } },
      ];
    }

    if (category && category !== "All") {
      filter.categoryId = category;
    }

    if (status && status !== "All") {
      filter.status = status;
    }

    const [products, totalCount, statsAgg] = await Promise.all([
      Product.find(filter).sort({ createdAt: -1 }).skip(offset).limit(limitNum),
      Product.countDocuments(filter),
      Product.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalProducts: { $sum: 1 },
            lowStockProducts: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $gt: ["$stock.currentStock", 0] },
                      { $gt: ["$stock.reorderLevel", 0] },
                      { $lte: ["$stock.currentStock", "$stock.reorderLevel"] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            outOfStockProducts: {
              $sum: { $cond: [{ $lte: ["$stock.currentStock", 0] }, 1, 0] },
            },
            inventoryValue: {
              $sum: { $multiply: ["$stock.currentStock", "$costPrice"] },
            },
          },
        },
      ]),
    ]);

    const productsWithBatches = await attachBatches(products);
    const stats = statsAgg[0] || {};

    return res.status(200).json({
      success: true,
      totalCount,
      data: productsWithBatches,
      stats: {
        totalProducts: stats.totalProducts || 0,
        lowStockProducts: stats.lowStockProducts || 0,
        outOfStockProducts: stats.outOfStockProducts || 0,
        inventoryValue: stats.inventoryValue || 0,
      },
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(totalCount / limitNum),
    });
  } catch (error) {
    console.error("Get products error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid product ID" });
    }

    const product = await Product.findOne({ _id: id, isDeleted: false });

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const batches = await ProductBatch.find({ productId: id }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: {
        ...serializeProduct(product),
        batches: batches.map((b) => serializeBatch(b)),
      },
    });
  } catch (error) {
    console.log("Get product by ID error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const getProductByBarcode = async (req, res) => {
  try {
    const { barcode } = req.params;

    if (!barcode || !barcode.trim()) {
      return res.status(400).json({ success: false, message: "Barcode is required" });
    }

    const trimmed = barcode.trim();

    let product = await Product.findOne({ barcode: trimmed, isDeleted: false });
    let retired = false;

    if (!product) {
      product = await Product.findOne({
        previousBarcodes: trimmed,
        isDeleted: false,
      });
      retired = !!product;
    }

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product with this barcode not found",
      });
    }

    const batches = await ProductBatch.find({
      productId: product._id,
      isDeleted: false,
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      retired,
      message: retired
        ? `This is a retired barcode for ${product.productName} — please reprint a new label`
        : undefined,
      data: {
        ...serializeProduct(product),
        batches: batches.map((b) => serializeBatch(b)),
      },
    });
  } catch (error) {
    console.error("Get product by barcode error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const reprintBarcode = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid product ID" });
    }

    const product = await Product.findOne({ _id: id, isDeleted: false });

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    if (!product.barcode) {
      return res.status(400).json({
        success: false,
        message: "This product has no barcode to reprint",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        product_id: String(product._id),
        product_name: product.productName,
        barcode: product.barcode,
        sale_price: product.salePrice,
      },
    });
  } catch (error) {
    console.error("Reprint barcode error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const regenerateBarcode = async (req, res) => {
  try {
    const { id } = req.params;
    const { confirm } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid product ID" });
    }

    if (confirm !== true) {
      return res.status(400).json({
        success: false,
        message:
          "Regenerating a barcode retires the old one. Pass { confirm: true } to proceed.",
      });
    }

    const product = await Product.findOne({ _id: id, isDeleted: false });

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const newBarcode = await generateProductBarcode();

    if (product.barcode) {
      product.previousBarcodes = [...(product.previousBarcodes || []), product.barcode];
    }
    product.barcode = newBarcode;

    await product.save();

    return res.status(200).json({
      success: true,
      message: "New barcode generated. Reprint and replace the old sticker.",
      data: serializeProduct(product),
    });
  } catch (error) {
    console.error("Regenerate barcode error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const markBarcodePrinted = async (req, res) => {
  try {
    const { id } = req.params;
    const parsedQuantity = Number(req.body?.quantity);

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid product ID" });
    }

    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      return res.status(400).json({
        success: false,
        message: "quantity must be a positive number",
      });
    }

    const product = await Product.findOneAndUpdate(
      { _id: id, isDeleted: false },
      {
        barcodeLabel: {
          lastPrintedAt: new Date(),
          lastPrintedQuantity: parsedQuantity,
        },
      },
      { new: true },
    );

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    return res.status(200).json({ success: true, data: serializeProduct(product) });
  } catch (error) {
    console.error("Mark barcode printed error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const uploadProductPhoto = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid product ID" });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: "Photo file is required" });
    }

    const product = await Product.findOne({ _id: id, isDeleted: false });

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const oldPublicId = product.photoPublicId;

    const result = await uploadImageBuffer(req.file.buffer, {
      folder: "byapardesk/products",
    });

    product.photoUrl = result.secure_url;
    product.photoPublicId = result.public_id;
    await product.save();

    if (oldPublicId) {
      deleteImage(oldPublicId).catch((err) =>
        console.error("Failed to delete old product photo:", err.message),
      );
    }

    return res.status(200).json({
      success: true,
      message: "Photo uploaded successfully",
      data: serializeProduct(product),
    });
  } catch (error) {
    console.error("Upload product photo error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
