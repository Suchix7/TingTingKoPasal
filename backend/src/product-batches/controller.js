import mongoose from "mongoose";
import Product from "../models/Product.js";
import ProductBatch from "../models/ProductBatch.js";
import InventoryTransaction from "../models/InventoryTransaction.js";
import { serializeBatch } from "../utils/serialize.js";

export const createProductBatch = async (req, res) => {
  try {
    const { product_id, batch_number, quantity, cost_price, sale_price } = req.body;

    if (
      product_id === undefined ||
      !batch_number ||
      quantity === undefined ||
      cost_price === undefined ||
      sale_price === undefined
    ) {
      return res.status(400).json({ success: false, message: "Please provide all required fields" });
    }

    const parsedQuantity = Number(quantity);
    const parsedCostPrice = Number(cost_price);
    const parsedSalePrice = Number(sale_price);

    if (
      !mongoose.isValidObjectId(product_id) ||
      Number.isNaN(parsedQuantity) ||
      Number.isNaN(parsedCostPrice) ||
      Number.isNaN(parsedSalePrice)
    ) {
      return res.status(400).json({
        success: false,
        message: "Product ID, quantity, cost price, and sale price must be valid",
      });
    }
    if (parsedQuantity < 0) {
      return res.status(400).json({ success: false, message: "Quantity cannot be negative" });
    }
    if (parsedCostPrice < 0 || parsedSalePrice < 0) {
      return res.status(400).json({
        success: false,
        message: "Cost price and sale price cannot be negative",
      });
    }

    const trimmedBatchNumber = batch_number.trim();
    if (!trimmedBatchNumber) {
      return res.status(400).json({ success: false, message: "Batch number is required" });
    }

    const product = await Product.findOne({ _id: product_id, isDeleted: false });

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const existingBatch = await ProductBatch.findOne({
      productId: product_id,
      batchNumber: trimmedBatchNumber,
    });

    if (existingBatch) {
      return res.status(409).json({
        success: false,
        message: "A batch with the same batch number already exists for this product",
      });
    }

    const newBatch = await ProductBatch.create({
      productId: product_id,
      batchNumber: trimmedBatchNumber,
      quantity: parsedQuantity,
      costPrice: parsedCostPrice,
      salePrice: parsedSalePrice,
    });

    if (parsedQuantity > 0) {
      await InventoryTransaction.create({
        productId: product_id,
        batchId: newBatch._id,
        type: "IN",
        quantity: parsedQuantity,
        referenceType: "CREATE_BATCH",
      });
    }

    return res.status(201).json({
      success: true,
      message: "Product batch created successfully",
      data: serializeBatch(newBatch, { product_name: product.productName, sku: product.sku }),
    });
  } catch (error) {
    console.error("Create product batch error:", error.message);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Batch with same batch number already exists for this product",
      });
    }

    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const updateProductBatch = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid batch ID" });
    }

    const existingBatch = await ProductBatch.findById(id);

    if (!existingBatch) {
      return res.status(404).json({ success: false, message: "Product batch not found" });
    }

    const { product_id, batch_number, quantity, cost_price, sale_price } = req.body;

    const updatedProductId =
      product_id !== undefined && product_id !== "" ? product_id : existingBatch.productId;
    const updatedBatchNumber =
      batch_number !== undefined ? batch_number.trim() : existingBatch.batchNumber;
    const updatedQuantity =
      quantity !== undefined && quantity !== "" ? Number(quantity) : Number(existingBatch.quantity);
    const updatedCostPrice =
      cost_price !== undefined && cost_price !== ""
        ? Number(cost_price)
        : Number(existingBatch.costPrice);
    const updatedSalePrice =
      sale_price !== undefined && sale_price !== ""
        ? Number(sale_price)
        : Number(existingBatch.salePrice);

    if (!updatedBatchNumber) {
      return res.status(400).json({ success: false, message: "Batch number is required" });
    }
    if (!mongoose.isValidObjectId(updatedProductId)) {
      return res.status(400).json({ success: false, message: "Invalid product ID" });
    }
    if (Number.isNaN(updatedQuantity) || updatedQuantity < 0) {
      return res.status(400).json({ success: false, message: "Invalid quantity" });
    }
    if (Number.isNaN(updatedCostPrice) || updatedCostPrice < 0) {
      return res.status(400).json({ success: false, message: "Invalid cost price" });
    }
    if (Number.isNaN(updatedSalePrice) || updatedSalePrice < 0) {
      return res.status(400).json({ success: false, message: "Invalid sale price" });
    }

    const product = await Product.findOne({ _id: updatedProductId, isDeleted: false });

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const duplicateBatch = await ProductBatch.findOne({
      productId: updatedProductId,
      batchNumber: updatedBatchNumber,
      _id: { $ne: id },
    });

    if (duplicateBatch) {
      return res.status(409).json({
        success: false,
        message: "A batch with the same batch number already exists for this product",
      });
    }

    const previousQuantity = Number(existingBatch.quantity);
    const stockDifference = updatedQuantity - previousQuantity;

    existingBatch.productId = updatedProductId;
    existingBatch.batchNumber = updatedBatchNumber;
    existingBatch.quantity = updatedQuantity;
    existingBatch.costPrice = updatedCostPrice;
    existingBatch.salePrice = updatedSalePrice;
    await existingBatch.save();

    if (stockDifference !== 0) {
      await InventoryTransaction.create({
        productId: updatedProductId,
        batchId: existingBatch._id,
        type: stockDifference > 0 ? "IN" : "OUT",
        quantity: Math.abs(stockDifference),
        referenceType: "BATCH_ADJUSTMENT",
        referenceId: existingBatch._id,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product batch updated successfully",
      data: serializeBatch(existingBatch, { product_name: product.productName, sku: product.sku }),
    });
  } catch (error) {
    console.error("Update product batch error:", error.message);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Batch with same batch number already exists for this product",
      });
    }

    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const deleteProductBatch = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid batch ID" });
    }

    const existingBatch = await ProductBatch.findOne({ _id: id, isDeleted: false });

    if (!existingBatch) {
      return res.status(404).json({ success: false, message: "Product batch not found" });
    }

    const batchQuantity = Number(existingBatch.quantity);

    if (batchQuantity > 0) {
      await InventoryTransaction.create({
        productId: existingBatch.productId,
        batchId: existingBatch._id,
        type: "OUT",
        quantity: batchQuantity,
        referenceType: "BATCH_DELETED",
        referenceId: existingBatch._id,
      });
    }

    existingBatch.quantity = 0;
    existingBatch.isDeleted = true;
    existingBatch.deletedAt = new Date();
    await existingBatch.save();

    return res.status(200).json({ success: true, message: "Product batch deleted successfully" });
  } catch (error) {
    console.error("Delete product batch error:", error.message);

    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getProductBatches = async (req, res) => {
  try {
    const { page, limit, search } = req.query;

    const pageNum = Math.max(parseInt(page) || 1, 1);
    const limitNum = Math.max(parseInt(limit) || 10, 1);
    const offset = (pageNum - 1) * limitNum;

    const activeProductIds = search
      ? await Product.find({
          isDeleted: false,
          $or: [
            { productName: { $regex: search, $options: "i" } },
            { sku: { $regex: search, $options: "i" } },
            { barcode: { $regex: search, $options: "i" } },
          ],
        }).distinct("_id")
      : null;

    const filter = { isDeleted: false };

    if (search) {
      filter.$or = [{ batchNumber: { $regex: search, $options: "i" } }, { productId: { $in: activeProductIds } }];
    } else {
      const activeIds = await Product.find({ isDeleted: false }).distinct("_id");
      filter.productId = { $in: activeIds };
    }

    const [batches, totalCount] = await Promise.all([
      ProductBatch.find(filter)
        .populate("productId", "productName sku barcode")
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limitNum),
      ProductBatch.countDocuments(filter),
    ]);

    const data = batches.map((b) =>
      serializeBatch(b, {
        product_name: b.productId?.productName,
        sku: b.productId?.sku,
        barcode: b.productId?.barcode,
      }),
    );

    return res.status(200).json({
      success: true,
      totalCount,
      data,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(totalCount / limitNum),
    });
  } catch (error) {
    console.error("Get product batches error:", error.message);

    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getProductBatchesByProductId = async (req, res) => {
  try {
    const { productId } = req.params;

    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({ success: false, message: "Invalid product ID" });
    }

    const product = await Product.findOne({ _id: productId, isDeleted: false });

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const batches = await ProductBatch.find({ productId, isDeleted: false }).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      product: {
        id: String(product._id),
        product_name: product.productName,
        sku: product.sku,
        barcode: product.barcode,
      },
      totalCount: batches.length,
      data: batches.map((b) => serializeBatch(b)),
    });
  } catch (error) {
    console.error("Get product batches by product ID error:", error.message);

    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getProductBatchById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ success: false, message: "Product batch not found" });
    }

    const batch = await ProductBatch.findById(id).populate("productId", "productName sku barcode isDeleted");

    if (!batch || batch.productId?.isDeleted) {
      return res.status(404).json({ success: false, message: "Product batch not found" });
    }

    return res.status(200).json({
      success: true,
      data: serializeBatch(batch, {
        product_name: batch.productId?.productName,
        sku: batch.productId?.sku,
        barcode: batch.productId?.barcode,
      }),
    });
  } catch (error) {
    console.error("Get product batch by ID error:", error.message);

    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};
