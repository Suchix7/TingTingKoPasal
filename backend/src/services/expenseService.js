import mongoose from "mongoose";
import Expense from "../models/Expense.js";
import PaymentMethodTransaction from "../models/PaymentMethodTransaction.js";

export function serializeExpense(expense, paymentMethod = null) {
  const obj = expense.toObject ? expense.toObject() : expense;
  return {
    id: String(obj._id),
    expense_date: obj.expenseDate,
    category: obj.category,
    title: obj.title,
    amount: obj.amount,
    payment_method_id: obj.paymentMethodId ? String(obj.paymentMethodId) : null,
    notes: obj.notes,
    payment_method: paymentMethod?.paymentMethod || null,
    payment_method_type: paymentMethod?.type || null,
    created_at: obj.createdAt,
    updated_at: obj.updatedAt,
  };
}

export async function createExpense(body) {
  const { expense_date, category, title, amount, payment_method_id, notes } = body;
  const normalizedExpenseDate = expense_date ? new Date(expense_date) : new Date();
  const normalizedPaymentMethodId = payment_method_id || null;

  const session = await mongoose.startSession();
  try {
    let resultDoc;
    await session.withTransaction(async () => {
      const [expense] = await Expense.create(
        [
          {
            expenseDate: normalizedExpenseDate,
            category: category.trim(),
            title: title.trim(),
            amount: Number(amount),
            paymentMethodId: normalizedPaymentMethodId,
            notes: notes?.trim() || null,
          },
        ],
        { session },
      );

      if (normalizedPaymentMethodId) {
        await PaymentMethodTransaction.create(
          [
            {
              paymentMethodId: normalizedPaymentMethodId,
              transactionType: "EXPENSE_PAYMENT",
              direction: "OUT",
              amount: Number(amount),
              referenceType: "expense",
              referenceId: expense._id,
              title: `Expense: ${title.trim()}`,
              notes: notes?.trim() || null,
            },
          ],
          { session },
        );
      }
      resultDoc = expense;
    });
    return resultDoc;
  } finally {
    session.endSession();
  }
}

export async function updateExpense(id, body) {
  const session = await mongoose.startSession();
  try {
    let resultDoc;
    await session.withTransaction(async () => {
      const existing = await Expense.findById(id).session(session);
      if (!existing) {
        const err = new Error("Expense not found");
        err.statusCode = 404;
        throw err;
      }

      const { expense_date, category, title, amount, payment_method_id, notes } = body;

      const updatedExpenseDate = expense_date !== undefined ? new Date(expense_date) : existing.expenseDate;
      const updatedCategory = category !== undefined ? category.trim() : existing.category;
      const updatedTitle = title !== undefined ? title.trim() : existing.title;
      const updatedAmount = amount !== undefined ? Number(amount) : Number(existing.amount);
      const updatedPaymentMethodId =
        payment_method_id !== undefined ? payment_method_id || null : existing.paymentMethodId;
      const updatedNotes = notes !== undefined ? notes?.trim() || null : existing.notes;

      const oldPaymentMethodId = existing.paymentMethodId;
      const oldAmount = Number(existing.amount || 0);

      const hasLedgerChange =
        String(oldPaymentMethodId || "") !== String(updatedPaymentMethodId || "") ||
        oldAmount !== Number(updatedAmount) ||
        existing.expenseDate?.getTime() !== updatedExpenseDate?.getTime() ||
        existing.title !== updatedTitle ||
        existing.notes !== updatedNotes;

      if (hasLedgerChange && oldPaymentMethodId && oldAmount > 0) {
        await PaymentMethodTransaction.create(
          [
            {
              paymentMethodId: oldPaymentMethodId,
              transactionType: "ADJUSTMENT_IN",
              direction: "IN",
              amount: oldAmount,
              referenceType: "expense",
              referenceId: existing._id,
              title: `Expense Updated: ${existing.title}`,
              notes: "Reversed old expense payment before update",
            },
          ],
          { session },
        );
      }

      existing.expenseDate = updatedExpenseDate;
      existing.category = updatedCategory;
      existing.title = updatedTitle;
      existing.amount = updatedAmount;
      existing.paymentMethodId = updatedPaymentMethodId;
      existing.notes = updatedNotes;
      await existing.save({ session });

      if (hasLedgerChange && updatedPaymentMethodId && updatedAmount > 0) {
        await PaymentMethodTransaction.create(
          [
            {
              paymentMethodId: updatedPaymentMethodId,
              transactionType: "EXPENSE_PAYMENT",
              direction: "OUT",
              amount: updatedAmount,
              referenceType: "expense",
              referenceId: existing._id,
              title: `Expense: ${updatedTitle}`,
              notes: updatedNotes,
              transactionDate: updatedExpenseDate,
            },
          ],
          { session },
        );
      }
      resultDoc = existing;
    });
    return resultDoc;
  } finally {
    session.endSession();
  }
}

export async function deleteExpense(id) {
  const session = await mongoose.startSession();
  try {
    let deleted;
    await session.withTransaction(async () => {
      const existing = await Expense.findById(id).session(session);
      if (!existing) {
        const err = new Error("Expense not found");
        err.statusCode = 404;
        throw err;
      }
      const paymentMethodId = existing.paymentMethodId;
      const amount = Number(existing.amount || 0);

      if (paymentMethodId && amount > 0) {
        await PaymentMethodTransaction.create(
          [
            {
              paymentMethodId,
              transactionType: "ADJUSTMENT_IN",
              direction: "IN",
              amount,
              referenceType: "expense",
              referenceId: existing._id,
              title: `Deleted Expense: ${existing.title}`,
              notes: "Expense deleted, payment reversed",
            },
          ],
          { session },
        );
      }
      deleted = existing;
      await Expense.deleteOne({ _id: id }, { session });
    });
    return deleted;
  } finally {
    session.endSession();
  }
}
