import QuickSale from "../models/QuickSale.js";
import PaymentMethod from "../models/PaymentMethod.js";
import Sale from "../models/Sale.js";

const allowedStatuses = ["pending", "converted", "cancelled"];

function normalizeString(value) {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toNumber(value, defaultValue = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : defaultValue;
}

function normalizePayments(payments = []) {
  if (!Array.isArray(payments) || payments.length === 0) {
    return {
      isValid: false,
      message: !Array.isArray(payments) ? "Payments must be an array." : "At least one payment is required.",
      payments: [],
    };
  }
  const normalized = [];
  for (const payment of payments) {
    const paymentMethodId = payment.payment_method_id;
    const amount = toNumber(payment.amount, -1);
    if (!paymentMethodId) {
      return { isValid: false, message: "Each payment must have a valid payment method.", payments: [] };
    }
    if (amount <= 0) {
      return { isValid: false, message: "Each payment amount must be greater than zero.", payments: [] };
    }
    normalized.push({ paymentMethodId, amount });
  }
  return { isValid: true, payments: normalized };
}

async function serializeQuickSale(qs) {
  const obj = qs.toObject ? qs.toObject() : qs;
  const paymentMethodIds = [...new Set(obj.payments.map((p) => String(p.paymentMethodId)))];
  const methods = await PaymentMethod.find({ _id: { $in: paymentMethodIds } });
  const methodMap = new Map(methods.map((m) => [String(m._id), m]));
  const totalAmount = obj.payments.reduce((sum, p) => sum + Number(p.amount), 0);

  return {
    id: String(obj._id),
    quick_sale_date: obj.quickSaleDate,
    notes: obj.notes,
    status: obj.status,
    converted_sale_id: obj.convertedSaleId ? String(obj.convertedSaleId) : null,
    total_amount: totalAmount,
    created_at: obj.createdAt,
    updated_at: obj.updatedAt,
    payments: obj.payments.map((p) => ({
      payment_method_id: String(p.paymentMethodId),
      payment_method_name: methodMap.get(String(p.paymentMethodId))?.paymentMethod || null,
      amount: p.amount,
    })),
  };
}

export const createQuickSale = async (req, res) => {
  try {
    const { notes, payments = [] } = req.body;
    const result = normalizePayments(payments);
    if (!result.isValid) {
      return res.status(400).json({ success: false, message: result.message });
    }

    const quickSale = await QuickSale.create({
      notes: normalizeString(notes),
      payments: result.payments,
    });

    return res.status(201).json({
      success: true,
      message: "Quick sale created successfully.",
      data: await serializeQuickSale(quickSale),
    });
  } catch (error) {
    console.error("Create quick sale error:", error);
    return res.status(500).json({ success: false, message: "Failed to create quick sale.", error: error.message });
  }
};

export const getQuickSales = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit) || 10, 1);
    const offset = (page - 1) * limit;

    const search = normalizeString(req.query.search);
    const status = normalizeString(req.query.status);

    const match = {};
    if (search) {
      const regex = new RegExp(search, "i");
      match.notes = regex;
    }
    if (status && allowedStatuses.includes(status)) {
      match.status = status;
    }

    const [total, quickSales] = await Promise.all([
      QuickSale.countDocuments(match),
      QuickSale.find(match).sort({ quickSaleDate: -1, _id: -1 }).skip(offset).limit(limit),
    ]);

    const data = await Promise.all(quickSales.map(serializeQuickSale));

    return res.status(200).json({
      success: true,
      message: "Quick sales fetched successfully.",
      data,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Get quick sales error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch quick sales.", error: error.message });
  }
};

export const getQuickSaleById = async (req, res) => {
  try {
    const quickSale = await QuickSale.findById(req.params.id);
    if (!quickSale) {
      return res.status(404).json({ success: false, message: "Quick sale not found." });
    }
    return res.status(200).json({
      success: true,
      message: "Quick sale fetched successfully.",
      data: await serializeQuickSale(quickSale),
    });
  } catch (error) {
    console.error("Get quick sale by id error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch quick sale.", error: error.message });
  }
};

export const updateQuickSale = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await QuickSale.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Quick sale not found." });
    }
    if (existing.status !== "pending") {
      return res.status(400).json({ success: false, message: "Only pending quick sales can be updated." });
    }

    const { notes, status, payments } = req.body;
    if (status && !["pending", "cancelled"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status update. Use pending or cancelled only." });
    }

    let paymentResult = null;
    if (payments !== undefined) {
      paymentResult = normalizePayments(payments);
      if (!paymentResult.isValid) {
        return res.status(400).json({ success: false, message: paymentResult.message });
      }
    }

    if (notes !== undefined) existing.notes = normalizeString(notes);
    if (status) existing.status = status;
    if (paymentResult) existing.payments = paymentResult.payments;
    await existing.save();

    return res.status(200).json({
      success: true,
      message: "Quick sale updated successfully.",
      data: await serializeQuickSale(existing),
    });
  } catch (error) {
    console.error("Update quick sale error:", error);
    return res.status(500).json({ success: false, message: "Failed to update quick sale.", error: error.message });
  }
};

export const cancelQuickSale = async (req, res) => {
  try {
    const existing = await QuickSale.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Quick sale not found." });
    }
    if (existing.status === "converted") {
      return res.status(400).json({ success: false, message: "Converted quick sale cannot be cancelled." });
    }
    if (existing.status === "cancelled") {
      return res.status(400).json({ success: false, message: "Quick sale is already cancelled." });
    }
    existing.status = "cancelled";
    await existing.save();
    return res.status(200).json({
      success: true,
      message: "Quick sale cancelled successfully.",
      data: await serializeQuickSale(existing),
    });
  } catch (error) {
    console.error("Cancel quick sale error:", error);
    return res.status(500).json({ success: false, message: "Failed to cancel quick sale.", error: error.message });
  }
};

export const markQuickSaleAsConverted = async (req, res) => {
  try {
    const { converted_sale_id } = req.body;
    if (!converted_sale_id) {
      return res.status(400).json({ success: false, message: "Converted sale ID is required." });
    }
    const existing = await QuickSale.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Quick sale not found." });
    }
    if (existing.status !== "pending") {
      return res.status(400).json({ success: false, message: "Only pending quick sales can be converted." });
    }
    const sale = await Sale.findById(converted_sale_id);
    if (!sale) {
      return res.status(404).json({ success: false, message: "Converted sale not found." });
    }
    existing.status = "converted";
    existing.convertedSaleId = converted_sale_id;
    await existing.save();
    return res.status(200).json({
      success: true,
      message: "Quick sale marked as converted successfully.",
      data: await serializeQuickSale(existing),
    });
  } catch (error) {
    console.error("Convert quick sale error:", error);
    return res.status(500).json({ success: false, message: "Failed to convert quick sale.", error: error.message });
  }
};

export const deleteQuickSale = async (req, res) => {
  try {
    const existing = await QuickSale.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Quick sale not found." });
    }
    if (existing.status === "converted") {
      return res.status(400).json({ success: false, message: "Converted quick sale cannot be deleted." });
    }
    await QuickSale.deleteOne({ _id: existing._id });
    return res.status(200).json({ success: true, message: "Quick sale deleted successfully." });
  } catch (error) {
    console.error("Delete quick sale error:", error);
    return res.status(500).json({ success: false, message: "Failed to delete quick sale.", error: error.message });
  }
};
