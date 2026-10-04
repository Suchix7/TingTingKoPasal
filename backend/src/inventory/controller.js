import mongoose from "mongoose";
import Product from "../models/Product.js";
import ProductBatch from "../models/ProductBatch.js";
import InventoryTransaction from "../models/InventoryTransaction.js";
import { serializeBatch } from "../utils/serialize.js";

export const updateInventory = async (req, res) => {
  try {
    const { id } = req.params;
    const { current_stock, reorder_level, reorder_quantity } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid inventory ID" });
    }

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({ success: false, message: "Inventory not found" });
    }

    const updatedCurrentStock =
      current_stock !== undefined
        ? Number(current_stock)
        : Number(product.stock.currentStock);
    const updatedReorderLevel =
      reorder_level !== undefined
        ? Number(reorder_level)
        : Number(product.stock.reorderLevel);
    const updatedReorderQuantity =
      reorder_quantity !== undefined
        ? Number(reorder_quantity)
        : Number(product.stock.reorderQuantity);

    if (
      Number.isNaN(updatedCurrentStock) ||
      Number.isNaN(updatedReorderLevel) ||
      Number.isNaN(updatedReorderQuantity)
    ) {
      return res.status(400).json({
        success: false,
        message: "Inventory values must be valid numbers",
      });
    }

    if (updatedCurrentStock < 0 || updatedReorderLevel < 0 || updatedReorderQuantity < 0) {
      return res.status(400).json({
        success: false,
        message: "Inventory values cannot be negative",
      });
    }

    const existingStock = Number(product.stock.currentStock);
    const stockDifference = updatedCurrentStock - existingStock;

    product.stock.currentStock = updatedCurrentStock;
    product.stock.reorderLevel = updatedReorderLevel;
    product.stock.reorderQuantity = updatedReorderQuantity;
    await product.save();

    if (stockDifference !== 0) {
      await InventoryTransaction.create({
        productId: product._id,
        type: stockDifference > 0 ? "IN" : "OUT",
        quantity: Math.abs(stockDifference),
        referenceType: "ADJUSTMENT",
        referenceId: product._id,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Standard inventory updated successfully",
      data: {
        id: String(product._id),
        product_id: String(product._id),
        standard_stock: product.stock.currentStock,
        reorder_level: product.stock.reorderLevel,
        reorder_quantity: product.stock.reorderQuantity,
        last_restocked_at: product.stock.lastRestockedAt,
        updated_at: product.updatedAt,
      },
    });
  } catch (error) {
    console.error("Update inventory error:", error.message);

    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const restockInventory = async (req, res) => {
  try {
    const { product_id, quantity } = req.body;

    if (!product_id || quantity === undefined || Number(quantity) <= 0) {
      return res.status(400).json({ success: false, message: "Invalid restock data" });
    }

    const product = await Product.findById(product_id);

    if (!product) {
      return res.status(404).json({ success: false, message: "Inventory not found" });
    }

    product.stock.currentStock += Number(quantity);
    product.stock.lastRestockedAt = new Date();
    await product.save();

    await InventoryTransaction.create({
      productId: product._id,
      type: "IN",
      quantity: Number(quantity),
      referenceType: "RESTOCK",
    });

    return res.json({ success: true, message: "Inventory restocked" });
  } catch (error) {
    console.error("Restock inventory error:", error.message);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const deductInventory = async (req, res) => {
  try {
    const { product_id, quantity } = req.body;

    if (quantity === undefined || Number(quantity) <= 0) {
      return res.status(400).json({ success: false, message: "Invalid deduction quantity" });
    }

    const product = await Product.findById(product_id);

    if (!product) {
      return res.status(404).json({ success: false, message: "Inventory not found" });
    }

    if (product.stock.currentStock < Number(quantity)) {
      return res.status(400).json({ success: false, message: "Not enough stock available" });
    }

    product.stock.currentStock -= Number(quantity);
    await product.save();

    await InventoryTransaction.create({
      productId: product._id,
      type: "OUT",
      quantity: Number(quantity),
      referenceType: "DEDUCT",
    });

    return res.json({ success: true, message: "Inventory deducted successfully" });
  } catch (error) {
    console.error("Deduct inventory error:", error.message);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getAllInventory = async (req, res) => {
  try {
    const {
      page,
      limit,
      search = "",
      statusFilter = "ALL",
      sortBy = "updated_desc",
    } = req.query;

    const pageNum = Math.max(parseInt(page) || 1, 1);
    const limitNum = Math.max(parseInt(limit) || 10, 1);
    const offset = (pageNum - 1) * limitNum;

    const matchStage = { isDeleted: false };

    if (search) {
      matchStage.$or = [
        { productName: { $regex: search, $options: "i" } },
        { sku: { $regex: search, $options: "i" } },
        { barcode: { $regex: search, $options: "i" } },
      ];
    }

    const pipeline = [
      { $match: matchStage },
      {
        $lookup: {
          from: "productbatches",
          let: { pid: "$_id" },
          pipeline: [
            { $match: { $expr: { $and: [{ $eq: ["$productId", "$$pid"] }, { $eq: ["$isDeleted", false] }] } } },
          ],
          as: "batches",
        },
      },
      {
        $addFields: {
          batchStock: { $sum: "$batches.quantity" },
          totalStock: { $add: ["$stock.currentStock", { $sum: "$batches.quantity" }] },
        },
      },
    ];

    if (statusFilter && statusFilter !== "ALL") {
      const statusMatch = {
        OUT_OF_STOCK: { totalStock: { $lte: 0 } },
        CRITICAL: {
          $expr: {
            $and: [
              { $gt: ["$totalStock", 0] },
              { $gt: ["$stock.reorderLevel", 0] },
              { $lte: ["$totalStock", { $multiply: ["$stock.reorderLevel", 0.5] }] },
            ],
          },
        },
        LOW: {
          $expr: {
            $and: [
              { $gt: ["$stock.reorderLevel", 0] },
              { $gt: ["$totalStock", { $multiply: ["$stock.reorderLevel", 0.5] }] },
              { $lte: ["$totalStock", "$stock.reorderLevel"] },
            ],
          },
        },
        HEALTHY: {
          $expr: {
            $or: [
              { $lte: ["$stock.reorderLevel", 0] },
              { $gt: ["$totalStock", "$stock.reorderLevel"] },
            ],
          },
        },
      }[statusFilter];

      if (statusMatch) pipeline.push({ $match: statusMatch });
    }

    const sortMap = {
      stock_asc: { totalStock: 1 },
      stock_desc: { totalStock: -1 },
      name_asc: { productName: 1 },
      name_desc: { productName: -1 },
      updated_desc: { updatedAt: -1 },
    };

    const [rows, countRows, statsRows] = await Promise.all([
      Product.aggregate([
        ...pipeline,
        { $sort: sortMap[sortBy] || sortMap.updated_desc },
        { $skip: offset },
        { $limit: limitNum },
      ]),
      Product.aggregate([...pipeline, { $count: "count" }]),
      Product.aggregate([
        ...pipeline,
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            outOfStock: { $sum: { $cond: [{ $lte: ["$totalStock", 0] }, 1, 0] } },
            critical: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $gt: ["$totalStock", 0] },
                      { $gt: ["$stock.reorderLevel", 0] },
                      { $lte: ["$totalStock", { $multiply: ["$stock.reorderLevel", 0.5] }] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            lowStock: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $gt: ["$stock.reorderLevel", 0] },
                      { $gt: ["$totalStock", { $multiply: ["$stock.reorderLevel", 0.5] }] },
                      { $lte: ["$totalStock", "$stock.reorderLevel"] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            healthy: {
              $sum: {
                $cond: [
                  {
                    $or: [
                      { $lte: ["$stock.reorderLevel", 0] },
                      { $gt: ["$totalStock", "$stock.reorderLevel"] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]),
    ]);

    const totalCount = countRows[0]?.count || 0;
    const stats = statsRows[0] || {};

    const formatted = rows.map((item) => ({
      inventory_id: String(item._id),
      product_id: String(item._id),
      standard_stock: item.stock?.currentStock || 0,
      reorder_level: item.stock?.reorderLevel || 0,
      reorder_quantity: item.stock?.reorderQuantity || 0,
      last_restocked_at: item.stock?.lastRestockedAt || null,
      updated_at: item.updatedAt,
      product_name: item.productName,
      sku: item.sku,
      barcode: item.barcode,
      product_status: item.status,
      unit: item.unit,
      cost_price: item.costPrice,
      sale_price: item.salePrice,
      total_stock: item.totalStock || 0,
      batches: (item.batches || []).map((b) => serializeBatch(b)),
    }));

    return res.status(200).json({
      success: true,
      totalCount,
      data: formatted,
      stats: {
        total: stats.total || 0,
        outOfStock: stats.outOfStock || 0,
        critical: stats.critical || 0,
        lowStock: stats.lowStock || 0,
        healthy: stats.healthy || 0,
      },
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(totalCount / limitNum),
    });
  } catch (error) {
    console.error("Get inventory error:", error.message);

    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getInventoryByProductId = async (req, res) => {
  try {
    const { id: productId } = req.params;

    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({ success: false, message: "Invalid product ID" });
    }

    const product = await Product.findOne({ _id: productId, isDeleted: false });

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const batches = await ProductBatch.find({ productId }).sort({ createdAt: -1 });

    const standardStock = Number(product.stock?.currentStock) || 0;
    const batchStock = batches.reduce((sum, b) => sum + Number(b.quantity || 0), 0);

    return res.status(200).json({
      success: true,
      data: {
        product_id: String(product._id),
        product_name: product.productName,
        sku: product.sku,
        barcode: product.barcode,
        unit: product.unit,
        product_status: product.status,
        cost_price: product.costPrice,
        sale_price: product.salePrice,
        inventory_id: String(product._id),
        standard_stock: standardStock,
        batch_stock: batchStock,
        total_stock: standardStock + batchStock,
        reorder_level: Number(product.stock?.reorderLevel) || 0,
        reorder_quantity: Number(product.stock?.reorderQuantity) || 0,
        last_restocked_at: product.stock?.lastRestockedAt || null,
        updated_at: product.updatedAt,
        batches: batches.map((b) => serializeBatch(b)),
      },
    });
  } catch (error) {
    console.error("Get inventory by product error:", error.message);

    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

async function mutateBatch(req, res, { deltaFn, referenceType, notFoundMsg }) {
  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ success: false, message: "Invalid batch ID" });
  }

  const batch = await ProductBatch.findById(id);

  if (!batch) {
    return res.status(404).json({ success: false, message: notFoundMsg });
  }

  return { batch };
}

export const updateProductBatch = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, batch_number, cost_price, sale_price } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid batch ID" });
    }

    const existingBatch = await ProductBatch.findById(id);

    if (!existingBatch) {
      return res.status(404).json({ success: false, message: "Product batch not found" });
    }

    const updatedQuantity =
      quantity !== undefined ? Number(quantity) : Number(existingBatch.quantity);
    const updatedCostPrice =
      cost_price !== undefined ? Number(cost_price) : Number(existingBatch.costPrice);
    const updatedSalePrice =
      sale_price !== undefined ? Number(sale_price) : Number(existingBatch.salePrice);
    const updatedBatchNumber =
      batch_number !== undefined ? String(batch_number).trim() : existingBatch.batchNumber;

    if (
      Number.isNaN(updatedQuantity) ||
      Number.isNaN(updatedCostPrice) ||
      Number.isNaN(updatedSalePrice)
    ) {
      return res.status(400).json({ success: false, message: "Batch values must be valid numbers" });
    }
    if (updatedQuantity < 0) {
      return res.status(400).json({ success: false, message: "Batch quantity cannot be negative" });
    }
    if (updatedCostPrice < 0 || updatedSalePrice < 0) {
      return res.status(400).json({
        success: false,
        message: "Batch cost price and sale price cannot be negative",
      });
    }
    if (!updatedBatchNumber) {
      return res.status(400).json({ success: false, message: "Batch number is required" });
    }

    const duplicateBatch = await ProductBatch.findOne({
      productId: existingBatch.productId,
      batchNumber: updatedBatchNumber,
      _id: { $ne: id },
    });

    if (duplicateBatch) {
      return res.status(409).json({
        success: false,
        message: "Batch with same batch number already exists for this product",
      });
    }

    const existingQuantity = Number(existingBatch.quantity);
    const stockDifference = updatedQuantity - existingQuantity;

    existingBatch.batchNumber = updatedBatchNumber;
    existingBatch.quantity = updatedQuantity;
    existingBatch.costPrice = updatedCostPrice;
    existingBatch.salePrice = updatedSalePrice;
    await existingBatch.save();

    if (stockDifference !== 0) {
      await InventoryTransaction.create({
        productId: existingBatch.productId,
        batchId: existingBatch._id,
        type: stockDifference > 0 ? "IN" : "OUT",
        quantity: Math.abs(stockDifference),
        referenceType: "ADJUSTMENT",
        referenceId: existingBatch._id,
      });
    }

    const product = await Product.findById(existingBatch.productId);

    return res.status(200).json({
      success: true,
      message: "Product batch updated successfully",
      data: serializeBatch(existingBatch, {
        product_name: product?.productName,
        sku: product?.sku,
        unit: product?.unit,
      }),
    });
  } catch (error) {
    console.error("Update product batch error:", error.message);

    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const restockProductBatch = async (req, res) => {
  try {
    const { id } = req.params;
    const restockQuantity = Number(req.body.quantity);

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid batch ID" });
    }
    if (Number.isNaN(restockQuantity) || restockQuantity <= 0) {
      return res.status(400).json({ success: false, message: "Invalid restock quantity" });
    }

    const batch = await ProductBatch.findById(id);

    if (!batch) {
      return res.status(404).json({ success: false, message: "Product batch not found" });
    }

    batch.quantity += restockQuantity;
    await batch.save();

    await InventoryTransaction.create({
      productId: batch.productId,
      batchId: batch._id,
      type: "IN",
      quantity: restockQuantity,
      referenceType: "RESTOCK",
      referenceId: batch._id,
    });

    const product = await Product.findById(batch.productId);

    return res.status(200).json({
      success: true,
      message: "Product batch restocked successfully",
      data: serializeBatch(batch, {
        product_name: product?.productName,
        sku: product?.sku,
        unit: product?.unit,
      }),
    });
  } catch (error) {
    console.error("Restock product batch error:", error.message);

    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const deductProductBatch = async (req, res) => {
  try {
    const { id } = req.params;
    const deductQuantity = Number(req.body.quantity);

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid batch ID" });
    }
    if (Number.isNaN(deductQuantity) || deductQuantity <= 0) {
      return res.status(400).json({ success: false, message: "Invalid deduction quantity" });
    }

    const batch = await ProductBatch.findById(id);

    if (!batch) {
      return res.status(404).json({ success: false, message: "Product batch not found" });
    }

    if (Number(batch.quantity) < deductQuantity) {
      return res.status(400).json({ success: false, message: "Not enough batch stock available" });
    }

    batch.quantity -= deductQuantity;
    await batch.save();

    await InventoryTransaction.create({
      productId: batch.productId,
      batchId: batch._id,
      type: "OUT",
      quantity: deductQuantity,
      referenceType: "DEDUCT",
      referenceId: batch._id,
    });

    const product = await Product.findById(batch.productId);

    return res.status(200).json({
      success: true,
      message: "Product batch stock deducted successfully",
      data: serializeBatch(batch, {
        product_name: product?.productName,
        sku: product?.sku,
        unit: product?.unit,
      }),
    });
  } catch (error) {
    console.error("Deduct product batch error:", error.message);

    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};
