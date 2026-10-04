import Expense from "../models/Expense.js";
import PaymentMethod from "../models/PaymentMethod.js";
import * as expenseService from "../services/expenseService.js";
import { serializeExpense } from "../services/expenseService.js";

const isValidAmount = (value) =>
  value !== undefined && value !== null && !isNaN(Number(value)) && Number(value) >= 0;

const isValidDate = (date) => {
  if (!date) return true;
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(date)) return false;
  return !isNaN(new Date(date).getTime());
};

async function withPaymentMethod(expense) {
  const pm = expense.paymentMethodId ? await PaymentMethod.findById(expense.paymentMethodId) : null;
  return serializeExpense(expense, pm);
}

export const createExpense = async (req, res) => {
  try {
    const { expense_date, category, title, amount, payment_method_id, notes } = req.body;

    if (!category || !category.trim()) {
      return res.status(400).json({ success: false, message: "Category is required" });
    }
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: "Title is required" });
    }
    if (!isValidAmount(amount)) {
      return res.status(400).json({
        success: false,
        message: "Amount must be a valid number greater than or equal to 0",
      });
    }
    if (!isValidDate(expense_date)) {
      return res.status(400).json({ success: false, message: "Invalid expense date format. Use YYYY-MM-DD" });
    }
    if (payment_method_id) {
      const paymentMethod = await PaymentMethod.findById(payment_method_id);
      if (!paymentMethod) {
        return res.status(404).json({ success: false, message: "Payment method not found" });
      }
    }

    const expense = await expenseService.createExpense({
      expense_date,
      category,
      title,
      amount,
      payment_method_id,
      notes,
    });

    return res.status(201).json({
      success: true,
      message: "Expense created successfully",
      data: await withPaymentMethod(expense),
    });
  } catch (error) {
    console.error("Create expense error:", error);
    return res.status(500).json({ success: false, message: "Failed to create expense" });
  }
};

export const getAllExpenses = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.max(Number(req.query.limit) || 10, 1);
    const offset = (page - 1) * limit;

    const search = req.query.search?.trim() || "";
    const category = req.query.category?.trim() || "";
    const paymentMethodId = req.query.payment_method_id;
    const startDate = req.query.start_date;
    const endDate = req.query.end_date;

    if (!isValidDate(startDate) || !isValidDate(endDate)) {
      return res.status(400).json({ success: false, message: "Invalid date format. Use YYYY-MM-DD" });
    }

    const match = {};
    if (search) {
      const regex = new RegExp(search, "i");
      match.$or = [{ title: regex }, { category: regex }, { notes: regex }];
    }
    if (category) match.category = category;
    if (paymentMethodId) match.paymentMethodId = paymentMethodId;
    if (startDate || endDate) {
      match.expenseDate = {};
      if (startDate) match.expenseDate.$gte = new Date(startDate);
      if (endDate) match.expenseDate.$lte = new Date(`${endDate}T23:59:59.999Z`);
    }

    const [expenses, totalCount, totalAmountAgg] = await Promise.all([
      Expense.find(match).sort({ expenseDate: -1, _id: -1 }).skip(offset).limit(limit),
      Expense.countDocuments(match),
      Expense.aggregate([{ $match: match }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
    ]);

    const paymentMethodIds = [...new Set(expenses.map((e) => e.paymentMethodId).filter(Boolean))];
    const paymentMethods = await PaymentMethod.find({ _id: { $in: paymentMethodIds } });
    const pmMap = new Map(paymentMethods.map((pm) => [String(pm._id), pm]));

    return res.status(200).json({
      success: true,
      data: expenses.map((e) => serializeExpense(e, e.paymentMethodId ? pmMap.get(String(e.paymentMethodId)) : null)),
      totalCount,
      totalAmount: totalAmountAgg[0]?.total || 0,
      page,
      limit,
    });
  } catch (error) {
    console.error("Get all expenses error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch expenses" });
  }
};

export const getExpenseById = async (req, res) => {
  try {
    const { id } = req.params;
    const expense = await Expense.findById(id);
    if (!expense) {
      return res.status(404).json({ success: false, message: "Expense not found" });
    }
    return res.status(200).json({ success: true, data: await withPaymentMethod(expense) });
  } catch (error) {
    console.error("Get expense by ID error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch expense" });
  }
};

export const updateExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await Expense.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Expense not found" });
    }

    const { expense_date, category, title, amount, payment_method_id } = req.body;
    if (expense_date !== undefined && !isValidDate(expense_date)) {
      return res.status(400).json({ success: false, message: "Invalid expense date format. Use YYYY-MM-DD" });
    }
    if (category !== undefined && !category.trim()) {
      return res.status(400).json({ success: false, message: "Category cannot be empty" });
    }
    if (title !== undefined && !title.trim()) {
      return res.status(400).json({ success: false, message: "Title cannot be empty" });
    }
    if (amount !== undefined && !isValidAmount(amount)) {
      return res.status(400).json({
        success: false,
        message: "Amount must be a valid number greater than or equal to 0",
      });
    }
    if (payment_method_id) {
      const paymentMethod = await PaymentMethod.findById(payment_method_id);
      if (!paymentMethod) {
        return res.status(404).json({ success: false, message: "Payment method not found" });
      }
    }

    const updated = await expenseService.updateExpense(id, req.body);
    return res.status(200).json({
      success: true,
      message: "Expense updated successfully",
      data: await withPaymentMethod(updated),
    });
  } catch (error) {
    console.error("Update expense error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to update expense",
    });
  }
};

export const deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await expenseService.deleteExpense(id);
    return res.status(200).json({
      success: true,
      message: "Expense deleted successfully",
      data: serializeExpense(deleted),
    });
  } catch (error) {
    console.error("Delete expense error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to delete expense",
    });
  }
};
