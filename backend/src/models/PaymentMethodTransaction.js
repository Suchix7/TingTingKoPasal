import mongoose from "mongoose";

const TRANSACTION_TYPES = [
  "OPENING_BALANCE",
  "CAPITAL_ADDITION",
  "ADD_CAPITAL",
  "SALE_PAYMENT",
  "SALE_PAYMENT_ADJUSTMENT_IN",
  "SALE_PAYMENT_ADJUSTMENT_OUT",
  "SALE_RETURN",
  "SALE_CANCELLED",
  "SALE_DELETE_REVERSAL",
  "EXPENSE_PAYMENT",
  "EXPENSE_PAYMENT_REVERSAL",
  "EXPENSE_DELETE_REVERSAL",
  "PURCHASE_ORDER_PAYMENT",
  "PURCHASE_PAYMENT",
  "WITHDRAWAL",
  "TRANSFER_IN",
  "TRANSFER_OUT",
  "ADJUSTMENT_IN",
  "ADJUSTMENT_OUT",
];

const paymentMethodTransactionSchema = new mongoose.Schema(
  {
    paymentMethodId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PaymentMethod",
      required: true,
    },
    transactionType: { type: String, enum: TRANSACTION_TYPES, required: true },
    direction: { type: String, enum: ["IN", "OUT"], required: true },
    amount: { type: Number, required: true, min: 0.01 },
    referenceType: { type: String, default: null },
    referenceId: { type: mongoose.Schema.Types.ObjectId, default: null },
    title: { type: String, default: "" },
    notes: { type: String, default: "" },
    transactionDate: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

paymentMethodTransactionSchema.index({ paymentMethodId: 1, transactionDate: 1 });

export const TRANSACTION_TYPE_VALUES = TRANSACTION_TYPES;
export default mongoose.model(
  "PaymentMethodTransaction",
  paymentMethodTransactionSchema,
);
