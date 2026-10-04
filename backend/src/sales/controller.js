import Sale from "../models/Sale.js";
import * as saleService from "../services/saleService.js";
import {
  serializeSale,
  PAYMENT_METHOD_POPULATE,
} from "../services/saleService.js";
import { uploadImageBuffer, deleteImage } from "../utils/cloudinaryUpload.js";
import { logActivity } from "../utils/activityLog.js";

const rs = (n) => `Rs. ${Number(n || 0).toLocaleString("en-NP")}`;

export const createSale = async (req, res) => {
  try {
    const sale = await saleService.createSale(req.body);
    await logActivity({
      action: "SALE_CREATED",
      entityType: "Sale",
      entityId: sale.id,
      summary: `Sale ${sale.invoice_no} created - ${rs(sale.grand_total)}`,
      details: {
        invoice_no: sale.invoice_no,
        total: sale.grand_total,
        items: (sale.items || []).map((i) => `${i.product_name} x${i.quantity}`),
        customer: sale.customer_name || null,
      },
    });
    return res.status(201).json({
      success: true,
      message: "Sale created successfully",
      data: sale,
    });
  } catch (error) {
    console.error("Create sale error:", error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const getSales = async (req, res) => {
  try {
    const { page, limit, search, payment_status, sale_status } = req.query;
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const offset = (pageNum - 1) * limitNum;

    const match = {};
    if (search) {
      const regex = new RegExp(search, "i");
      match.$or = [
        { invoiceNo: regex },
        { customerName: regex },
        { customerPhone: regex },
      ];
    }
    if (payment_status) match.paymentStatus = payment_status;
    if (sale_status) match.saleStatus = sale_status;

    const [sales, totalCount, statsAgg] = await Promise.all([
      Sale.find(match)
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limitNum)
        .populate(PAYMENT_METHOD_POPULATE),
      Sale.countDocuments(match),
      Sale.aggregate([
        { $match: { ...match, saleStatus: "Completed" } },
        {
          $group: {
            _id: null,
            totalProfit: { $sum: "$profitAmount" },
            totalPaid: { $sum: "$paidAmount" },
            totalRemaining: { $sum: "$remainingAmount" },
            partialOrUnpaid: {
              $sum: { $cond: [{ $ne: ["$paymentStatus", "Paid"] }, 1, 0] },
            },
          },
        },
      ]),
    ]);

    const stats = statsAgg[0] || {
      totalProfit: 0,
      totalPaid: 0,
      totalRemaining: 0,
      partialOrUnpaid: 0,
    };

    return res.status(200).json({
      success: true,
      totalCount,
      data: sales.map(serializeSale),
      stats: {
        totalProfit: Number(stats.totalProfit) || 0,
        totalPaid: Number(stats.totalPaid) || 0,
        totalRemaining: Number(stats.totalRemaining) || 0,
        partialOrUnpaid: Number(stats.partialOrUnpaid) || 0,
      },
      page: pageNum,
      limit: limitNum,
    });
  } catch (error) {
    console.error("Get sales error:", error.message);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getSaleById = async (req, res) => {
  try {
    const { id } = req.params;
    const sale = await Sale.findById(id).populate(PAYMENT_METHOD_POPULATE);
    if (!sale) {
      return res.status(404).json({ success: false, message: "Sale not found" });
    }
    return res.status(200).json({ success: true, data: serializeSale(sale) });
  } catch (error) {
    console.error("Get sale by ID error:", error.message);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const updateSale = async (req, res) => {
  try {
    const { id } = req.params;
    const before = await Sale.findById(id).select("saleStatus invoiceNo").lean();
    const sale = await saleService.updateSale(id, req.body);
    const statusChanged = before && before.saleStatus !== sale.sale_status;
    await logActivity({
      action: statusChanged
        ? `SALE_${String(sale.sale_status).toUpperCase()}`
        : "SALE_UPDATED",
      entityType: "Sale",
      entityId: id,
      summary: statusChanged
        ? `Sale ${sale.invoice_no} marked ${sale.sale_status}`
        : `Sale ${sale.invoice_no} edited`,
      details: { invoice_no: sale.invoice_no, total: sale.grand_total },
    });
    return res.status(200).json({
      success: true,
      message: "Sale updated successfully",
      data: sale,
    });
  } catch (error) {
    console.error("Update sale error:", error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const deleteSale = async (req, res) => {
  try {
    const { id } = req.params;
    const before = await Sale.findById(id).select("invoiceNo grandTotal saleStatus").lean();
    await saleService.deleteSale(id);
    await logActivity({
      action: "SALE_DELETED",
      entityType: "Sale",
      entityId: id,
      summary: `Sale ${before?.invoiceNo || id} deleted${
        before ? ` (${rs(before.grandTotal)}, was ${before.saleStatus})` : ""
      }`,
      details: before ? { invoice_no: before.invoiceNo, total: before.grandTotal } : null,
    });
    return res.status(200).json({ success: true, message: "Sale deleted successfully" });
  } catch (error) {
    console.error("Delete sale error:", error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

// Revoke a mistaken sale: puts the stock back, reverses the payments and keeps
// the sale on record as Cancelled together with the reason.
export const revokeSale = async (req, res) => {
  try {
    const { id } = req.params;
    const reason = String(req.body?.reason ?? "").trim();

    const existing = await Sale.findById(id).select("saleStatus invoiceNo notes grandTotal").lean();
    if (!existing) {
      return res.status(404).json({ success: false, message: "Sale not found" });
    }
    if (existing.saleStatus !== "Completed") {
      return res.status(400).json({
        success: false,
        message: `Only completed sales can be revoked (this one is ${existing.saleStatus})`,
      });
    }

    const note = reason ? `Revoked: ${reason}` : "Revoked";
    const sale = await saleService.updateSale(id, {
      sale_status: "Cancelled",
      notes: existing.notes ? `${existing.notes}
${note}` : note,
    });

    await logActivity({
      action: "SALE_REVOKED",
      entityType: "Sale",
      entityId: id,
      summary: `Sale ${existing.invoiceNo} revoked (${rs(existing.grandTotal)})${
        reason ? ` - ${reason}` : ""
      }`,
      details: { invoice_no: existing.invoiceNo, total: existing.grandTotal, reason: reason || null },
    });

    return res.status(200).json({
      success: true,
      message: "Sale revoked. Stock restored and payments reversed.",
      data: sale,
    });
  } catch (error) {
    console.error("Revoke sale error:", error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const getSaleItems = async (req, res) => {
  try {
    const { sale_id, product_id } = req.query;
    const match = {};
    if (sale_id) match._id = sale_id;
    if (product_id) match["items.productId"] = product_id;

    const sales = await Sale.find(match).sort({ createdAt: -1 });
    const items = [];
    for (const sale of sales) {
      for (const item of sale.items) {
        if (product_id && String(item.productId) !== String(product_id)) continue;
        items.push({
          sale_id: String(sale._id),
          product_id: String(item.productId),
          batch_id: item.batchId ? String(item.batchId) : null,
          product_name: item.productName,
          sku: item.sku,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          discount_amount: item.discountAmount,
          tax_amount: item.taxAmount,
          tax_inclusive: item.taxInclusive,
          total_price: item.totalPrice,
          cost_price: item.costPrice,
          profit_amount: item.profitAmount,
          created_at: sale.createdAt,
        });
      }
    }
    return res.status(200).json({ success: true, data: items });
  } catch (error) {
    console.error("Get sale items error:", error.message);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getSaleItemById = async (req, res) => {
  return res.status(404).json({
    success: false,
    message: "Sale items no longer have independent IDs — use /sales/:id",
  });
};

export const getSalePayments = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page || 1), 1);
    const limit = Math.max(Number(req.query.limit || 10), 1);
    const saleId = req.query.sale_id || null;

    const match = saleId ? { _id: saleId } : {};
    const sales = await Sale.find(match)
      .sort({ createdAt: -1 })
      .populate(PAYMENT_METHOD_POPULATE);

    const allPayments = [];
    for (const sale of sales) {
      for (const payment of sale.payments) {
        const isPopulated =
          payment.paymentMethodId && typeof payment.paymentMethodId === "object";
        allPayments.push({
          sale_id: String(sale._id),
          payment_method_id: isPopulated
            ? String(payment.paymentMethodId._id)
            : String(payment.paymentMethodId),
          payment_method: isPopulated
            ? payment.paymentMethodId.paymentMethod
            : null,
          amount: payment.amount,
          created_at: payment.createdAt,
          invoice_no: sale.invoiceNo,
          customer_name: sale.customerName,
          customer_phone: sale.customerPhone,
          grand_total: sale.grandTotal,
          paid_amount: sale.paidAmount,
          remaining_amount: sale.remainingAmount,
          payment_status: sale.paymentStatus,
        });
      }
    }

    const totalCount = allPayments.length;
    const offset = (page - 1) * limit;
    const data = allPayments.slice(offset, offset + limit);

    return res.status(200).json({ success: true, data, totalCount, page, limit });
  } catch (error) {
    console.error("Get sale payments error:", error.message);
    return res.status(500).json({ success: false, message: error.message || "Internal server error" });
  }
};

export const getSalePaymentById = async (req, res) => {
  return res.status(404).json({
    success: false,
    message: "Sale payments no longer have independent IDs — use /sales/:id",
  });
};

export const uploadPaymentProof = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({ success: false, message: "Photo is required" });
    }

    const sale = await Sale.findById(id).populate(PAYMENT_METHOD_POPULATE);
    if (!sale) {
      return res.status(404).json({ success: false, message: "Sale not found" });
    }

    const oldPublicId = sale.paymentProofPublicId;

    const result = await uploadImageBuffer(req.file.buffer, {
      folder: "byapardesk/payment-proofs",
    });

    sale.paymentProofUrl = result.secure_url;
    sale.paymentProofPublicId = result.public_id;
    await sale.save();

    if (oldPublicId) {
      deleteImage(oldPublicId).catch((error) =>
        console.error("Failed to delete old payment proof:", error.message),
      );
    }

    return res.status(200).json({
      success: true,
      message: "Payment proof uploaded successfully",
      data: serializeSale(sale),
    });
  } catch (error) {
    console.error("Upload payment proof error:", error.message);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const getSalePaymentsBySaleId = async (req, res) => {
  try {
    const saleId = req.query.sale_id;
    if (!saleId) {
      return res.status(400).json({ success: false, message: "sale_id is required" });
    }
    const sale = await Sale.findById(saleId).populate(PAYMENT_METHOD_POPULATE);
    if (!sale) {
      return res.status(200).json({ success: true, data: [] });
    }
    const data = sale.payments.map((payment) => {
      const isPopulated =
        payment.paymentMethodId && typeof payment.paymentMethodId === "object";
      return {
        sale_id: String(sale._id),
        payment_method_id: isPopulated
          ? String(payment.paymentMethodId._id)
          : String(payment.paymentMethodId),
        payment_method: isPopulated
          ? payment.paymentMethodId.paymentMethod
          : null,
        amount: payment.amount,
        created_at: payment.createdAt,
      };
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Get sale payments by sale error:", error.message);
    return res.status(500).json({ success: false, message: error.message || "Internal server error" });
  }
};
