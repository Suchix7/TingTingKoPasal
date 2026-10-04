import mongoose from "mongoose";

const quickSalePaymentSchema = new mongoose.Schema(
  {
    paymentMethodId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PaymentMethod",
      required: true,
    },
    amount: { type: Number, required: true },
  },
  { _id: false },
);

const quickSaleSchema = new mongoose.Schema(
  {
    quickSaleDate: { type: Date, default: Date.now },
    notes: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "converted", "cancelled"],
      default: "pending",
    },
    convertedSaleId: { type: mongoose.Schema.Types.ObjectId, ref: "Sale", default: null },
    payments: { type: [quickSalePaymentSchema], default: [] },
  },
  { timestamps: true },
);

export default mongoose.model("QuickSale", quickSaleSchema);
