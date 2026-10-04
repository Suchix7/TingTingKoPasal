import mongoose from "mongoose";
import InventoryTransaction from "../models/InventoryTransaction.js";
import Product from "../models/Product.js";
import ProductBatch from "../models/ProductBatch.js";

export const getAllInventoryTransactions = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.max(Number(req.query.limit) || 10, 1);
    const offset = (page - 1) * limit;

    const search = req.query.search?.trim() || "";
    const transaction_type =
      req.query.transaction_type?.trim()?.toUpperCase() ||
      req.query.type?.trim()?.toUpperCase() ||
      "";
    const reference_type = req.query.reference_type?.trim()?.toUpperCase() || "";
    const from_date = req.query.from_date?.trim() || "";
    const to_date = req.query.to_date?.trim() || "";
    const product_id = req.query.product_id || null;
    const batch_id = req.query.batch_id || null;
    const sort_by = req.query.sort_by?.trim() || "created_at";
    const sort_order = req.query.sort_order?.trim()?.toUpperCase() || "DESC";

    const allowedTransactionTypes = ["IN", "OUT", "ADJUSTMENT"];
    const allowedSortBy = ["created_at", "quantity", "transaction_type", "batch_number"];
    const allowedSortOrder = ["ASC", "DESC"];

    if (transaction_type && !allowedTransactionTypes.includes(transaction_type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid transaction type. Allowed values are IN, OUT and ADJUSTMENT.",
      });
    }
    if (!allowedSortBy.includes(sort_by)) {
      return res.status(400).json({ success: false, message: "Invalid sort field" });
    }
    if (!allowedSortOrder.includes(sort_order)) {
      return res.status(400).json({ success: false, message: "Invalid sort order" });
    }

    const match = {};
    if (transaction_type) match.type = transaction_type;
    if (reference_type) match.referenceType = reference_type;
    if (product_id && mongoose.isValidObjectId(product_id)) {
      match.productId = new mongoose.Types.ObjectId(product_id);
    }
    if (batch_id && mongoose.isValidObjectId(batch_id)) {
      match.batchId = new mongoose.Types.ObjectId(batch_id);
    }
    if (from_date || to_date) {
      match.createdAt = {};
      if (from_date) match.createdAt.$gte = new Date(from_date);
      if (to_date) {
        const end = new Date(to_date);
        end.setHours(23, 59, 59, 999);
        match.createdAt.$lte = end;
      }
    }

    const pipeline = [
      { $match: match },
      {
        $lookup: {
          from: "products",
          localField: "productId",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "productbatches",
          localField: "batchId",
          foreignField: "_id",
          as: "batch",
        },
      },
      { $unwind: { path: "$batch", preserveNullAndEmptyArrays: true } },
    ];

    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { "product.productName": { $regex: search, $options: "i" } },
            { "product.sku": { $regex: search, $options: "i" } },
            { "product.barcode": { $regex: search, $options: "i" } },
            { type: { $regex: search, $options: "i" } },
            { referenceType: { $regex: search, $options: "i" } },
            { "batch.batchNumber": { $regex: search, $options: "i" } },
          ],
        },
      });
    }

    const sortFieldMap = {
      created_at: "createdAt",
      quantity: "quantity",
      transaction_type: "type",
      batch_number: "batch.batchNumber",
    };
    const sortStage = { [sortFieldMap[sort_by]]: sort_order === "ASC" ? 1 : -1 };

    const [rows, countRows, statsRows] = await Promise.all([
      InventoryTransaction.aggregate([
        ...pipeline,
        { $sort: sortStage },
        { $skip: offset },
        { $limit: limit },
      ]),
      InventoryTransaction.aggregate([...pipeline, { $count: "count" }]),
      InventoryTransaction.aggregate([
        ...pipeline,
        {
          $group: {
            _id: null,
            total_inflows: { $sum: { $cond: [{ $eq: ["$type", "IN"] }, "$quantity", 0] } },
            total_outflows: { $sum: { $cond: [{ $eq: ["$type", "OUT"] }, "$quantity", 0] } },
            total_adjustments: {
              $sum: { $cond: [{ $eq: ["$type", "ADJUSTMENT"] }, "$quantity", 0] },
            },
            transactions: { $sum: 1 },
          },
        },
      ]),
    ]);

    const totalCount = countRows[0]?.count || 0;
    const stats = statsRows[0] || {};
    const netChange =
      (stats.total_inflows || 0) - (stats.total_outflows || 0) + (stats.total_adjustments || 0);

    const data = rows.map((it) => ({
      id: String(it._id),
      product_id: it.productId ? String(it.productId) : null,
      batch_id: it.batchId ? String(it.batchId) : null,
      transaction_type: it.type,
      quantity: it.quantity,
      reference_type: it.referenceType,
      reference_id: it.referenceId ? String(it.referenceId) : null,
      created_at: it.createdAt,
      product_name: it.product?.productName,
      sku: it.product?.sku,
      unit: it.product?.unit,
      batch_number: it.batch?.batchNumber,
      batch_current_quantity: it.batch?.quantity,
      batch_cost_price: it.batch?.costPrice,
      batch_sale_price: it.batch?.salePrice,
      batch_created_at: it.batch?.createdAt,
    }));

    return res.status(200).json({
      success: true,
      data,
      totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
      stats: {
        total_inflows: stats.total_inflows || 0,
        total_outflows: stats.total_outflows || 0,
        total_adjustments: stats.total_adjustments || 0,
        net_change: netChange,
        transactions: stats.transactions || 0,
      },
    });
  } catch (error) {
    console.error("Get inventory transactions error:", error.message);

    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getInventoryTransactionById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ success: false, message: "Inventory transaction not found" });
    }

    const transaction = await InventoryTransaction.findById(id)
      .populate("productId", "productName sku unit")
      .populate("batchId", "batchNumber quantity costPrice salePrice createdAt");

    if (!transaction) {
      return res.status(404).json({ success: false, message: "Inventory transaction not found" });
    }

    return res.status(200).json({
      success: true,
      data: {
        id: String(transaction._id),
        product_id: transaction.productId?._id ? String(transaction.productId._id) : null,
        batch_id: transaction.batchId?._id ? String(transaction.batchId._id) : null,
        type: transaction.type,
        quantity: transaction.quantity,
        reference_type: transaction.referenceType,
        reference_id: transaction.referenceId ? String(transaction.referenceId) : null,
        created_at: transaction.createdAt,
        product_name: transaction.productId?.productName,
        sku: transaction.productId?.sku,
        unit: transaction.productId?.unit,
        batch_number: transaction.batchId?.batchNumber,
        batch_current_quantity: transaction.batchId?.quantity,
        batch_cost_price: transaction.batchId?.costPrice,
        batch_sale_price: transaction.batchId?.salePrice,
        batch_created_at: transaction.batchId?.createdAt,
      },
    });
  } catch (error) {
    console.error("Get inventory transaction error:", error.message);

    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getInventoryTransactionsByProductId = async (req, res) => {
  try {
    const { product_id } = req.params;

    if (!mongoose.isValidObjectId(product_id)) {
      return res.status(400).json({ success: false, message: "Invalid product id" });
    }

    const transactions = await InventoryTransaction.find({ productId: product_id })
      .populate("productId", "productName sku unit")
      .populate("batchId", "batchNumber quantity costPrice salePrice createdAt")
      .sort({ createdAt: -1, _id: -1 });

    const data = transactions.map((it) => ({
      id: String(it._id),
      product_id: it.productId?._id ? String(it.productId._id) : null,
      batch_id: it.batchId?._id ? String(it.batchId._id) : null,
      type: it.type,
      quantity: it.quantity,
      reference_type: it.referenceType,
      reference_id: it.referenceId ? String(it.referenceId) : null,
      created_at: it.createdAt,
      product_name: it.productId?.productName,
      sku: it.productId?.sku,
      unit: it.productId?.unit,
      batch_number: it.batchId?.batchNumber,
    }));

    return res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    console.error("Get product inventory transactions error:", error.message);

    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getInventoryTransactionsByBatchId = async (req, res) => {
  try {
    const { batch_id } = req.params;

    if (!mongoose.isValidObjectId(batch_id)) {
      return res.status(400).json({ success: false, message: "Invalid batch id" });
    }

    const batch = await ProductBatch.findById(batch_id).populate(
      "productId",
      "productName sku unit",
    );

    if (!batch) {
      return res.status(404).json({ success: false, message: "Product batch not found" });
    }

    const transactions = await InventoryTransaction.find({ batchId: batch_id })
      .populate("productId", "productName sku unit")
      .sort({ createdAt: -1, _id: -1 });

    const data = transactions.map((it) => ({
      id: String(it._id),
      product_id: it.productId?._id ? String(it.productId._id) : null,
      type: it.type,
      quantity: it.quantity,
      reference_type: it.referenceType,
      created_at: it.createdAt,
      product_name: it.productId?.productName,
      sku: it.productId?.sku,
      unit: it.productId?.unit,
      batch_number: batch.batchNumber,
      batch_cost_price: batch.costPrice,
      batch_sale_price: batch.salePrice,
    }));

    return res.status(200).json({
      success: true,
      count: data.length,
      batch: {
        id: String(batch._id),
        product_id: batch.productId?._id ? String(batch.productId._id) : null,
        batch_number: batch.batchNumber,
        product_name: batch.productId?.productName,
        sku: batch.productId?.sku,
        unit: batch.productId?.unit,
      },
      data,
    });
  } catch (error) {
    console.error("Get batch inventory transactions error:", error.message);

    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getInventoryTransactionSummary = async (req, res) => {
  try {
    const summary = await InventoryTransaction.aggregate([
      {
        $group: {
          _id: { productId: "$productId", batchId: "$batchId" },
          total_in: { $sum: { $cond: [{ $eq: ["$type", "IN"] }, "$quantity", 0] } },
          total_out: { $sum: { $cond: [{ $eq: ["$type", "OUT"] }, "$quantity", 0] } },
          total_adjustment: {
            $sum: { $cond: [{ $eq: ["$type", "ADJUSTMENT"] }, "$quantity", 0] },
          },
        },
      },
      {
        $addFields: {
          net_quantity: { $subtract: [{ $add: ["$total_in", "$total_adjustment"] }, "$total_out"] },
        },
      },
      {
        $lookup: {
          from: "products",
          localField: "_id.productId",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "productbatches",
          localField: "_id.batchId",
          foreignField: "_id",
          as: "batch",
        },
      },
      { $unwind: { path: "$batch", preserveNullAndEmptyArrays: true } },
      { $sort: { "_id.productId": -1, "_id.batchId": -1 } },
    ]);

    const data = summary.map((row) => ({
      product_id: row._id.productId ? String(row._id.productId) : null,
      product_name: row.product?.productName,
      sku: row.product?.sku,
      batch_id: row._id.batchId ? String(row._id.batchId) : null,
      batch_number: row.batch?.batchNumber,
      total_in: row.total_in,
      total_out: row.total_out,
      total_adjustment: row.total_adjustment,
      net_quantity: row.net_quantity,
    }));

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Inventory transaction summary error:", error.message);

    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};
