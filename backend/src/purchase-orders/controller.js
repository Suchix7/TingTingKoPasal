import PurchaseOrder from "../models/PurchaseOrder.js";
import Supplier from "../models/Supplier.js";
import Product from "../models/Product.js";
import ProductBatch from "../models/ProductBatch.js";
import * as poService from "../services/purchaseOrderService.js";
import { serializePurchaseOrder } from "../services/purchaseOrderService.js";

export const createPurchaseOrder = async (req, res) => {
  try {
    const data = await poService.createPurchaseOrder(req.body);
    return res.status(201).json({
      success: true,
      message: "Purchase order created successfully",
      data,
    });
  } catch (error) {
    console.error("Create purchase order error:", error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

async function enrichItems(items) {
  const productIds = [...new Set(items.map((i) => i.product_id))];
  const batchIds = [...new Set(items.map((i) => i.batch_id).filter(Boolean))];
  const [products, batches] = await Promise.all([
    Product.find({ _id: { $in: productIds } }),
    ProductBatch.find({ _id: { $in: batchIds } }),
  ]);
  const productMap = new Map(products.map((p) => [String(p._id), p]));
  const batchMap = new Map(batches.map((b) => [String(b._id), b]));

  return items.map((item) => {
    const product = productMap.get(item.product_id);
    const batch = item.batch_id ? batchMap.get(item.batch_id) : null;
    return {
      ...item,
      product_name: product?.productName || null,
      sku: product?.sku || null,
      batch_number: batch?.batchNumber || null,
      batch_cost_price: Number(batch?.costPrice || 0),
      batch_sale_price: Number(batch?.salePrice || 0),
    };
  });
}

export const getAllPurchaseOrders = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.max(Number(req.query.limit) || 10, 1);
    const search = req.query.search?.trim() || "";
    const status = req.query.status?.trim() || "";
    const sortBy = req.query.sortBy?.trim() || "date_desc";
    const offset = (page - 1) * limit;

    const allowedStatuses = ["Pending", "Received", "Cancelled"];
    const allowedSortBy = ["date_desc", "date_asc", "total_desc", "total_asc", "supplier_asc"];

    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid purchase order status" });
    }
    if (!allowedSortBy.includes(sortBy)) {
      return res.status(400).json({ success: false, message: "Invalid sort option" });
    }

    const match = {};
    if (status) match.status = status;

    let supplierIds = null;
    if (search) {
      const regex = new RegExp(search, "i");
      const matchingSuppliers = await Supplier.find({
        $or: [{ supplierName: regex }, { contactPerson: regex }],
      }).select("_id");
      supplierIds = matchingSuppliers.map((s) => s._id);
      match.$or = [{ notes: regex }, { supplierId: { $in: supplierIds } }];
    }

    const sortMap = {
      date_desc: { createdAt: -1 },
      date_asc: { createdAt: 1 },
      total_desc: { totalCost: -1 },
      total_asc: { totalCost: 1 },
      supplier_asc: { supplierId: 1 },
    };

    const [purchaseOrders, totalCount, statsAgg] = await Promise.all([
      PurchaseOrder.find(match).sort(sortMap[sortBy]).skip(offset).limit(limit),
      PurchaseOrder.countDocuments(match),
      PurchaseOrder.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            pending: { $sum: { $cond: [{ $eq: ["$status", "Pending"] }, 1, 0] } },
            received: { $sum: { $cond: [{ $eq: ["$status", "Received"] }, 1, 0] } },
            cancelled: { $sum: { $cond: [{ $eq: ["$status", "Cancelled"] }, 1, 0] } },
            totalValue: { $sum: "$totalCost" },
          },
        },
      ]),
    ]);

    const supplierIdsOnPage = [...new Set(purchaseOrders.map((po) => po.supplierId).filter(Boolean))];
    const suppliers = await Supplier.find({ _id: { $in: supplierIdsOnPage } });
    const supplierMap = new Map(suppliers.map((s) => [String(s._id), s]));

    const data = await Promise.all(
      purchaseOrders.map(async (po) => {
        const serialized = serializePurchaseOrder(po);
        const supplier = po.supplierId ? supplierMap.get(String(po.supplierId)) : null;
        serialized.supplier_name = supplier?.supplierName || null;
        serialized.contact_person = supplier?.contactPerson || null;
        serialized.supplier_phone = supplier?.phone || null;
        serialized.supplier_email = supplier?.email || null;
        serialized.items = await enrichItems(serialized.items);
        return serialized;
      }),
    );

    const stats = statsAgg[0] || { total: 0, pending: 0, received: 0, cancelled: 0, totalValue: 0 };

    return res.status(200).json({
      success: true,
      data,
      totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
      stats: {
        total: Number(stats.total) || 0,
        pending: Number(stats.pending) || 0,
        received: Number(stats.received) || 0,
        cancelled: Number(stats.cancelled) || 0,
        totalValue: Number(stats.totalValue) || 0,
      },
    });
  } catch (error) {
    console.error("Get purchase orders error:", error.message);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getPurchaseOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const po = await PurchaseOrder.findById(id);
    if (!po) {
      return res.status(404).json({ success: false, message: "Purchase order not found" });
    }
    const serialized = serializePurchaseOrder(po);
    serialized.items = await enrichItems(serialized.items);
    return res.json({ success: true, data: serialized });
  } catch (error) {
    console.error("Get purchase order error:", error.message);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const updatePurchaseOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!["Pending", "Received", "Cancelled"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid purchase order status" });
    }
    const data = await poService.receivePurchaseOrder(id, status);
    return res.json({
      success: true,
      message: "Purchase order status updated successfully",
      data,
    });
  } catch (error) {
    console.error("Update purchase order status error:", error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const deletePurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;
    await poService.deletePurchaseOrder(id);
    return res.json({ success: true, message: "Purchase order deleted successfully" });
  } catch (error) {
    console.error("Delete purchase order error:", error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};
