import mongoose from "mongoose";

const paymentMethodSchema = new mongoose.Schema(
  {
    paymentMethod: { type: String, required: true, unique: true, trim: true },
    type: { type: String, enum: ["Cash", "Digital", "Bank"], required: true },
    qrCode: { type: String, default: "" },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
    notes: { type: String, default: "" },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export default mongoose.model("PaymentMethod", paymentMethodSchema);
