import mongoose from "mongoose";

const expenseSchema = new mongoose.Schema(
  {
    expenseDate: { type: Date, default: Date.now },
    category: { type: String, required: true },
    title: { type: String, required: true },
    amount: { type: Number, required: true, min: 0.01 },
    paymentMethodId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PaymentMethod",
      default: null,
    },
    notes: { type: String, default: "" },
  },
  { timestamps: true },
);

export default mongoose.model("Expense", expenseSchema);
