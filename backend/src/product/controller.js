import mongoose from "mongoose";
import Product from "../models/Product.js";
import ProductBatch from "../models/ProductBatch.js";
import InventoryTransaction from "../models/InventoryTransaction.js";
import { generateProductBarcode } from "../utils/barcode.js";
import { logActivity } from "../utils/activityLog.js";
import { deleteImage, signProductUpload, cloudName } from "../utils/cloudinaryUpload.js";
import Category from "../models/Category.js";
import { serializeProduct, serializeBatch } from "../utils/serialize.js";
import { totalStockStages } from "../utils/stock.js";
import { parseStockLines, syncStockLines } from "../utils/stockLines.js";
import {
  productMedia,
  videoPoster,
  MAX_PRODUCT_MEDIA,
  PRODUCT_MEDIA_FOLDER,
} from "../utils/media.js";

export const createProduct = async (req, res) => {
  try {
    const {
      product_name,
      product_name_zh,
      sku,
      category_id,
      cost_price,
      sale_price,
      stock_quantity,
      unit,
      status,
      description,
      variants,
      stock_lines,
    } = req.body;
    // Barcodes are always auto-generated; any client-supplied value is ignored.

    // Optional stock lines, each tracked as its own product batch:
    // phone models `variants: [{ model, quantity }]`, or colours with sizes /
    // phone models `stock_lines: [{ variant, size | model, quantity }]`.
    // `model` below is the line's name; `phone` its phone model.
    const parsedLines = parseStockLines(stock_lines);
    if (parsedLines.error) {
      return res.status(400).json({ success: false, message: parsedLines.error });
    }
    const variantList = parsedLines.lines
      ? parsedLines.lines.map((l) => ({
          model: l.name,
          variant: l.variant,
          size: l.size,
          phone: l.model,
          quantity: l.quantity,
          costPrice: l.costPrice,
          salePrice: l.salePrice,
        }))
      : Array.isArray(variants)
        ? variants
            .map((v) => ({
              model: String(v?.model ?? "").trim(),
              variant: "",
              size: "",
              phone: String(v?.model ?? "").trim(),
              quantity: Number(v?.quantity ?? 0),
            }))
            .filter((v) => v.model)
        : [];
    const hasVariants = variantList.length > 0;

    if (
      !product_name ||
      !category_id ||
      (!hasVariants && stock_quantity === undefined) ||
      !unit ||
      !status
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
    }

    // Prices are optional for now: a blank price is saved as 0
    const blank = (v) => v === undefined || v === null || v === "";
    const parsedCostPrice = blank(cost_price) ? 0 : Number(cost_price);
    const parsedSalePrice = blank(sale_price) ? 0 : Number(sale_price);
    // With variants, stock lives on the variants, not on the product itself
    const parsedStockQuantity = hasVariants ? 0 : Number(stock_quantity);

    const variantNames = new Set(variantList.map((v) => v.model.toLowerCase()));
    if (variantNames.size !== variantList.length) {
      return res.status(400).json({
        success: false,
        message: "Each size or phone model can only be listed once",
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

    const trimmedBarcode = null;
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
      productNameZh: String(product_name_zh || "").trim(),
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
          variant: variant.variant,
          size: variant.size,
          model: variant.phone,
          quantity: variant.quantity,
          // a colour / size can have its own price; otherwise the product's
          costPrice: variant.costPrice ?? parsedCostPrice,
          salePrice: variant.salePrice ?? parsedSalePrice,
          barcode: await generateProductBarcode(),
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

    await logActivity({
      action: "PRODUCT_CREATED",
      entityType: "Product",
      entityId: newProduct._id,
      summary: `Product "${newProduct.productName}" created${
        hasVariants ? ` with ${variantList.length} sizes/models` : ""
      }`,
      details: {
        sale_price: parsedSalePrice,
        cost_price: parsedCostPrice,
        stock: hasVariants ? variantList : parsedStockQuantity,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: serializeProduct(newProduct),
    });
  } catch (error) {
    console.error("Create product error:", error);

    return res.status(500).json({
      success: false,
      message: `Internal server error: ${error.message}`,
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
      product_name_zh,
      sku,
      category_id,
      cost_price,
      sale_price,
      stock_quantity,
      unit,
      status,
      description,
      stock_lines,
    } = req.body;
    // Barcodes are system-managed; edits never change them.

    // Optional colours/sizes [{ variant, size, quantity }]. Only sent when the
    // form edits them; the list replaces the product's stock lines.
    const parsedLines = parseStockLines(stock_lines);
    if (parsedLines.error) {
      return res.status(400).json({ success: false, message: parsedLines.error });
    }
    const syncSizes = !!parsedLines.lines;
    const sizeList = parsedLines.lines || [];

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
    // With sizes, stock lives on the sizes, not on the product itself
    const updatedStockQuantity =
      syncSizes && sizeList.length > 0
        ? 0
        : stock_quantity !== undefined && stock_quantity !== ""
          ? Number(stock_quantity)
          : Number(existingProduct.stock?.currentStock || 0);
    const updatedUnit = unit !== undefined ? unit : existingProduct.unit;
    const updatedStatus = status !== undefined ? status : existingProduct.status;
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
    if (product_name_zh !== undefined) {
      existingProduct.productNameZh = String(product_name_zh || "").trim();
    }
    existingProduct.sku = updatedSku.trim();
    existingProduct.categoryId = updatedCategory;
    existingProduct.costPrice = updatedCostPrice;
    existingProduct.salePrice = updatedSalePrice;
    existingProduct.unit = updatedUnit;
    existingProduct.status = updatedStatus;
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

    if (syncSizes) {
      await syncStockLines(existingProduct, sizeList);
    }

    await logActivity({
      action: "PRODUCT_UPDATED",
      entityType: "Product",
      entityId: existingProduct._id,
      summary: `Product "${existingProduct.productName}" updated`,
      details: {
        sale_price: existingProduct.salePrice,
        cost_price: existingProduct.costPrice,
        stock: syncSizes && sizeList.length
          ? sizeList.map(({ name, quantity }) => ({ name, quantity }))
          : existingProduct.stock?.currentStock,
      },
    });

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

    await logActivity({
      action: "PRODUCT_DELETED",
      entityType: "Product",
      entityId: existingProduct._id,
      summary: `Product "${existingProduct.productName}" deleted`,
    });

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

// Phone models (or sizes) used by the products in a category, with how many
// products have each and how many pieces are in stock. Drives the POS model
// chips shown under a category like "Covers". "Blue / iPhone 13" counts as
// iPhone 13.
export const getProductModels = async (req, res) => {
  try {
    const { category, status } = req.query;
    const productFilter = { isDeleted: false };
    if (category && category !== "All") {
      if (!mongoose.isValidObjectId(category)) {
        return res.status(400).json({ success: false, message: "Invalid category ID" });
      }
      productFilter.categoryId = new mongoose.Types.ObjectId(String(category));
    }
    if (status && status !== "All") productFilter.status = status;

    const productIds = await Product.distinct("_id", productFilter);

    const rows = await ProductBatch.aggregate([
      { $match: { isDeleted: false, productId: { $in: productIds } } },
      {
        $group: {
          _id: {
            $cond: [
              { $gt: [{ $strLenCP: { $ifNull: ["$model", ""] } }, 0] },
              "$model",
              {
                $cond: [
                  { $gt: [{ $strLenCP: { $ifNull: ["$size", ""] } }, 0] },
                  "$size",
                  "$batchNumber",
                ],
              },
            ],
          },
          products: { $addToSet: "$productId" },
          quantity: { $sum: "$quantity" },
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      data: rows.map((r) => ({
        model: r._id,
        product_count: r.products.length,
        quantity: r.quantity,
      })),
    });
  } catch (error) {
    console.error("Get product models error:", error.message);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getProducts = async (req, res) => {
  try {
    const { page, limit, search, category, status, stock, sort, model } = req.query;

    const pageNum = Math.max(parseInt(page) || 1, 1);
    const limitNum = Math.max(parseInt(limit) || 10, 1);
    const offset = (pageNum - 1) * limitNum;

    const filter = { isDeleted: false };
    const and = [];

    if (search) {
      const term = String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = { $regex: term, $options: "i" };
      // Phone models live on batches (e.g. a cover's "iPhone 15" model),
      // so a search for the model should find the product it belongs to.
      const modelMatches = await ProductBatch.distinct("productId", {
        isDeleted: false,
        $or: [{ batchNumber: regex }, { barcode: regex }],
      });
      and.push({
        $or: [
          { productName: regex },
          { productNameZh: regex },
          { sku: regex },
          { barcode: regex },
          { _id: { $in: modelMatches } },
        ],
      });
    }

    // Stock counts the product's own stock plus any model/batch stock
    if (stock === "in_stock" || stock === "out_of_stock") {
      const withModelStock = await ProductBatch.distinct("productId", {
        isDeleted: false,
        quantity: { $gt: 0 },
      });
      const inStock = {
        $or: [
          { "stock.currentStock": { $gt: 0 } },
          { _id: { $in: withModelStock } },
        ],
      };
      and.push(
        stock === "in_stock"
          ? inStock
          : {
              "stock.currentStock": { $lte: 0 },
              _id: { $nin: withModelStock },
            },
      );
    }

    // Only products that have this phone model (e.g. covers for "iPhone 13 Pro")
    if (model) {
      const withModel = await ProductBatch.distinct("productId", {
        isDeleted: false,
        $or: [{ batchNumber: String(model).trim() }, { model: String(model).trim() }],
      });
      and.push({ _id: { $in: withModel } });
    }

    if (and.length > 0) filter.$and = and;

    const sortOrder =
      {
        price_asc: { salePrice: 1, _id: 1 },
        price_desc: { salePrice: -1, _id: 1 },
        name_asc: { productName: 1, _id: 1 },
      }[sort] || { createdAt: -1 };

    if (category && category !== "All") {
      filter.categoryId = category;
    }

    if (status && status !== "All") {
      filter.status = status;
    }

    const [products, totalCount, statsAgg] = await Promise.all([
      Product.find(filter)
        .collation({ locale: "en" })
        .sort(sortOrder)
        .skip(offset)
        .limit(limitNum),
      Product.countDocuments(filter),
      // stock counts include what's held on phone models / batches
      Product.aggregate([
        { $match: filter },
        ...totalStockStages,
        {
          $group: {
            _id: null,
            totalProducts: { $sum: 1 },
            lowStockProducts: {
              $sum: {
                $cond: [
                  { $and: [{ $gt: ["$totalStock", 0] }, { $lte: ["$totalStock", 5] }] },
                  1,
                  0,
                ],
              },
            },
            outOfStockProducts: {
              $sum: { $cond: [{ $lte: ["$totalStock", 0] }, 1, 0] },
            },
            inventoryValue: {
              $sum: {
                $add: [
                  { $multiply: [{ $ifNull: ["$stock.currentStock", 0] }, "$costPrice"] },
                  "$batchValue",
                ],
              },
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

    // Not a product code: it may be a model/batch sticker, which identifies
    // both the product and the exact model to deduct.
    let matchedBatchId = null;
    if (!product) {
      const matchedBatch = await ProductBatch.findOne({
        barcode: trimmed,
        isDeleted: false,
      });
      if (matchedBatch) {
        product = await Product.findOne({
          _id: matchedBatch.productId,
          isDeleted: false,
        });
        matchedBatchId = matchedBatch._id;
      }
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
        matched_batch_id: matchedBatchId ? String(matchedBatchId) : null,
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

export const signProductMediaUpload = async (req, res) => {
  try {
    const type = req.body?.type === "video" ? "video" : "image";
    return res.json({ success: true, data: signProductUpload(type) });
  } catch (error) {
    console.error("Sign product media upload error:", error.message);
    return res.status(500).json({ success: false, message: "Uploads are not available" });
  }
};

// A newly uploaded item must be one of ours: in this Cloudinary account and
// the product folder.
function validNewMedia(item) {
  if (!item || typeof item !== "object") return null;
  const type = item.type === "video" ? "video" : item.type === "image" ? "image" : null;
  const { url, publicId } = item;
  if (!type || typeof url !== "string" || typeof publicId !== "string") return null;
  if (!publicId.startsWith(`${PRODUCT_MEDIA_FOLDER}/`)) return null;
  const prefix = `https://res.cloudinary.com/${cloudName()}/${type}/upload/`;
  if (!url.startsWith(prefix) || !url.includes(publicId)) return null;
  return { type, url, publicId };
}

// Body: { media: [...] } in display order; each entry is the id of a photo or
// video the product already has, or { type, url, publicId } for a new upload.
// Either may come as an object with `variant` (the colour/style it shows)
// and `size_guide` (it is the size chart); a bare id keeps its saved labels.
export const saveProductPhotos = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid product ID" });
    }

    const media = req.body?.media;
    if (!Array.isArray(media)) {
      return res.status(400).json({ success: false, message: "Invalid media list" });
    }
    if (media.length > MAX_PRODUCT_MEDIA) {
      return res.status(400).json({
        success: false,
        message: `A product can have at most ${MAX_PRODUCT_MEDIA} photos and videos`,
      });
    }

    const product = await Product.findOne({ _id: id, isDeleted: false });
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const current = productMedia(product);
    const byId = new Map(current.map((p) => [p.id, p]));

    const next = [];
    const used = new Set();
    let hasSizeGuide = false;
    for (const entry of media) {
      const saved =
        typeof entry === "string"
          ? byId.get(entry)
          : typeof entry?.id === "string"
            ? byId.get(entry.id)
            : null;
      const item = saved || (typeof entry === "object" ? validNewMedia(entry) : null);
      if (!item) {
        return res.status(400).json({ success: false, message: "Invalid photo or video" });
      }
      if (used.has(item.url)) continue;
      used.add(item.url);
      const labelled = typeof entry === "object" && entry !== null;
      const variant = labelled
        ? String(entry.variant ?? "").trim().slice(0, 60)
        : saved?.variant || "";
      // only one size guide per product
      const sizeGuide =
        !hasSizeGuide && (labelled ? !!entry.size_guide : !!saved?.sizeGuide);
      if (sizeGuide) hasSizeGuide = true;
      next.push({
        type: item.type,
        url: item.url,
        publicId: item.publicId,
        variant: sizeGuide ? "" : variant,
        sizeGuide,
      });
    }

    const cover = next[0];
    product.photos = next;
    product.photoUrl = cover
      ? cover.type === "video"
        ? videoPoster(cover.url)
        : cover.url
      : null;
    product.photoPublicId = cover?.publicId || null;
    await product.save();

    const kept = new Set(next.map((p) => p.publicId).filter(Boolean));
    for (const p of current) {
      if (p.publicId && !kept.has(p.publicId)) {
        deleteImage(p.publicId, p.type).catch((err) =>
          console.error("Failed to delete old product media:", err.message),
        );
      }
    }

    return res.status(200).json({
      success: true,
      message: "Photos saved",
      data: serializeProduct(product),
    });
  } catch (error) {
    console.error("Save product photos error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// English name -> Chinese name for products and categories, so the admin panel
// can show Chinese names wherever it only has the English one (sales, reports).
export const getNameMap = async (_req, res) => {
  try {
    const [products, categories] = await Promise.all([
      Product.find({ productNameZh: { $nin: [null, ""] } })
        .select("productName productNameZh")
        .lean(),
      Category.find({ categoryNameZh: { $nin: [null, ""] } })
        .select("categoryName categoryNameZh")
        .lean(),
    ]);

    const map = {};
    for (const c of categories) map[c.categoryName] = c.categoryNameZh;
    for (const p of products) map[p.productName] = p.productNameZh;

    return res.status(200).json({ success: true, data: map });
  } catch (error) {
    console.error("Name map error:", error.message);

    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};
