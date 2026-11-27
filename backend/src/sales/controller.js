import Sale from "../models/Sale.js";
import * as saleService from "../services/saleService.js";
import {
  serializeSale,
  PAYMENT_METHOD_POPULATE,
} from "../services/saleService.js";
import { uploadImageBuffer, deleteImage } from "../utils/cloudinaryUpload.js";
import { logActivity } from "../utils/activityLog.js";
import { attachItemPhotos, attachSalePhotos } from "../utils/saleItemPhotos.js";

import { escapeRegex } from "../utils/escapeRegex.js";
const rs = (n) => `Rs. ${Number(n || 0).toLocaleString("en-NP")}`;

export const createSale = async (req, res) => {
  try {
    const sale = await saleService.createSale(req.body);
    await logActivity({
      action: sale.is_cod ? "SALE_COD_CREATED" : "SALE_CREATED",
      entityType: "Sale",
      entityId: sale.id,
      summary: sale.is_cod
        ? `Cash on Delivery order ${sale.invoice_no} sent - ${rs(sale.grand_total)} to collect`
        : `Sale ${sale.invoice_no} created - ${rs(sale.grand_total)}`,
      details: {
        invoice_no: sale.invoice_no,
        total: sale.grand_total,
        items: (sale.items || []).map((i) => `${i.product_name} x${i.quantity}`),
        customer: sale.customer_name || null,
        payment: (sale.payments || [])
          .map((p) => `${p.payment_method || p.payment_method_type}: ${rs(p.amount)}`)
          .join(", "),
        // Items sold for less than the marked price (and why, if noted)
        sold_below_marked_price: (sale.items || [])
          .filter((i) => Number(i.discount_amount) > 0)
          .map((i) => {
            const marked = Number(i.unit_price);
            const sold = marked - Number(i.discount_amount) / Number(i.quantity);
            return `${i.product_name}: marked ${rs(marked)}, sold ${rs(sold)}${i.discount_reason ? ` (${i.discount_reason})` : ""
              }`;
          }),
        bill_discount: Number(sale.discount_amount) > 0 ? sale.discount_amount : null,
      },
    });
    return res.status(201).json({
      success: true,
      message: sale.is_cod
        ? "Cash on Delivery order created - pending payment"
        : "Sale created successfully",
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
    const { page, limit, search, payment_status, sale_status, is_cod } = req.query;
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const offset = (pageNum - 1) * limitNum;

    const match = {};
    if (search) {
      const regex = new RegExp(escapeRegex(search), "i");
      match.$or = [
        { invoiceNo: regex },
        { customerName: regex },
        { customerPhone: regex },
      ];
    }
    if (payment_status) match.paymentStatus = payment_status;
    if (sale_status) match.saleStatus = sale_status;
    if (is_cod === "true") match.isCod = true;

    const [sales, totalCount, statsAgg, pendingAgg] = await Promise.all([
      Sale.find(match)
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limitNum)
        .populate(PAYMENT_METHOD_POPULATE)
        .populate("customerId", "name phone address email creditAmount creditLimit notes"),
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
      // Cash on Delivery orders still waiting for their money (all of them,
      // whatever the filters), for the Pending COD section
      Sale.aggregate([
        { $match: { saleStatus: "Pending" } },
        { $group: { _id: null, count: { $sum: 1 }, amount: { $sum: "$grandTotal" } } },
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
      data: await attachSalePhotos(sales.map(serializeSale)),
      stats: {
        totalProfit: Number(stats.totalProfit) || 0,
        totalPaid: Number(stats.totalPaid) || 0,
        totalRemaining: Number(stats.totalRemaining) || 0,
        partialOrUnpaid: Number(stats.partialOrUnpaid) || 0,
        pendingCodCount: Number(pendingAgg[0]?.count) || 0,
        pendingCodAmount: Number(pendingAgg[0]?.amount) || 0,
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
    const sale = await Sale.findById(id)
      .populate(PAYMENT_METHOD_POPULATE)
      .populate("customerId", "name phone address email creditAmount creditLimit notes");
    if (!sale) {
      return res.status(404).json({ success: false, message: "Sale not found" });
    }
    const [data] = await attachSalePhotos([serializeSale(sale)]);
    return res.status(200).json({ success: true, data });
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
        ? before.saleStatus === "Pending" && sale.sale_status === "Completed"
          ? "SALE_COD_COMPLETED"
          : `SALE_${String(sale.sale_status).toUpperCase()}`
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
      summary: `Sale ${before?.invoiceNo || id} deleted${before ? ` (${rs(before.grandTotal)}, was ${before.saleStatus})` : ""
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
    // A pending Cash on Delivery order can be called off too (customer
    // refused it / courier brought it back): the goods go back into stock.
    if (existing.saleStatus !== "Completed" && existing.saleStatus !== "Pending") {
      return res.status(400).json({
        success: false,
        message: `Only completed sales or pending COD orders can be revoked (this one is ${existing.saleStatus})`,
      });
    }
    const wasPendingCod = existing.saleStatus === "Pending";

    const label = wasPendingCod ? "COD order cancelled" : "Revoked";
    const note = reason ? `${label}: ${reason}` : label;
    const sale = await saleService.updateSale(id, {
      sale_status: "Cancelled",
      notes: existing.notes ? `${existing.notes}
${note}` : note,
    });

    await logActivity({
      action: wasPendingCod ? "SALE_COD_CANCELLED" : "SALE_REVOKED",
      entityType: "Sale",
      entityId: id,
      summary: `${wasPendingCod ? "COD order" : "Sale"} ${existing.invoiceNo} ${wasPendingCod ? "cancelled" : "revoked"
        } (${rs(existing.grandTotal)})${reason ? ` - ${reason}` : ""}`,
      details: { invoice_no: existing.invoiceNo, total: existing.grandTotal, reason: reason || null },
    });

    return res.status(200).json({
      success: true,
      message: wasPendingCod
        ? "COD order cancelled. Stock restored."
        : "Sale revoked. Stock restored and payments reversed.",
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

// Cash on Delivery: the money has arrived. Records the payment(s) and moves
// the order from Pending to Completed - from then on it counts in sales,
// profit, the daybook and the payment method balances like any other sale.
export const completeCodSale = async (req, res) => {
  try {
    const { id } = req.params;
    const payments = Array.isArray(req.body?.payments) ? req.body.payments : [];
    const extraNote = String(req.body?.notes ?? "").trim();

    const existing = await Sale.findById(id)
      .select("saleStatus invoiceNo notes grandTotal customerId")
      .lean();
    if (!existing) {
      return res.status(404).json({ success: false, message: "Sale not found" });
    }
    if (existing.saleStatus !== "Pending") {
      return res.status(400).json({
        success: false,
        message: `This order is not pending payment (it is ${existing.saleStatus})`,
      });
    }

    const validPayments = payments
      .filter((p) => p && p.payment_method_id && Number(p.amount) > 0)
      .map((p) => ({ payment_method_id: p.payment_method_id, amount: Number(p.amount) }));
    const paid = Number(validPayments.reduce((sum, p) => sum + p.amount, 0).toFixed(2));
    const total = Number(Number(existing.grandTotal || 0).toFixed(2));

    if (validPayments.length === 0 && total > 0) {
      return res.status(400).json({
        success: false,
        message: "Add the payment you received for this order",
      });
    }
    if (paid > total) {
      return res.status(400).json({
        success: false,
        message: `Received amount is more than the order total (${rs(total)})`,
      });
    }
    if (paid < total && !existing.customerId) {
      return res.status(400).json({
        success: false,
        message:
          "The full amount must be received - this order has no saved customer to keep the rest on credit",
      });
    }

    const note = extraNote ? `COD paid: ${extraNote}` : null;
    const sale = await saleService.updateSale(id, {
      sale_status: "Completed",
      payments: validPayments,
      ...(note ? { notes: existing.notes ? `${existing.notes}\n${note}` : note } : {}),
    });

    await logActivity({
      action: "SALE_COD_COMPLETED",
      entityType: "Sale",
      entityId: id,
      summary: `COD order ${existing.invoiceNo} paid - ${rs(paid)} received`,
      details: {
        invoice_no: existing.invoiceNo,
        total,
        received: paid,
        payment: (sale.payments || [])
          .map((p) => `${p.payment_method || p.payment_method_type}: ${rs(p.amount)}`)
          .join(", "),
      },
    });

    return res.status(200).json({
      success: true,
      message: "Payment received. Order marked completed.",
      data: sale,
    });
  } catch (error) {
    console.error("Complete COD sale error:", error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

// Pending Cash on Delivery orders, oldest first - for the notification bell
// and the badge on the Sales menu item.
export const getPendingCodSales = async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
    const [docs, agg] = await Promise.all([
      Sale.find({ saleStatus: "Pending" })
        .sort({ createdAt: 1 })
        .limit(limit)
        .select("invoiceNo customerId customerName customerPhone customerAddress notes grandTotal createdAt")
        .populate("customerId", "name phone address")
        .lean(),
      Sale.aggregate([
        { $match: { saleStatus: "Pending" } },
        { $group: { _id: null, count: { $sum: 1 }, amount: { $sum: "$grandTotal" } } },
      ]),
    ]);
    return res.status(200).json({
      success: true,
      count: Number(agg[0]?.count) || 0,
      total_amount: Number(agg[0]?.amount) || 0,
      data: docs.map((s) => ({
        id: String(s._id),
        invoice_no: s.invoiceNo,
        customer_id: s.customerId
          ? typeof s.customerId === "object"
            ? String(s.customerId._id)
            : String(s.customerId)
          : null,
        customer_name:
          s.customerName ||
          (typeof s.customerId === "object" ? s.customerId.name : null) ||
          null,
        customer_phone:
          s.customerPhone ||
          (typeof s.customerId === "object" ? s.customerId.phone : null) ||
          null,
        customer_address:
          s.customerAddress ||
          (typeof s.customerId === "object" ? s.customerId.address : null) ||
          null,
        notes: s.notes || null,
        grand_total: s.grandTotal,
        created_at: s.createdAt,
      })),
    });
  } catch (error) {
    console.error("Get pending COD sales error:", error.message);
    return res.status(500).json({ success: false, message: "Internal server error" });
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
          discount_reason: item.discountReason || null,
          tax_amount: item.taxAmount,
          tax_inclusive: item.taxInclusive,
          total_price: item.totalPrice,
          cost_price: item.costPrice,
          profit_amount: item.profitAmount,
          created_at: sale.createdAt,
        });
      }
    }
    await attachItemPhotos(items);
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
