import mongoose from "mongoose";

const customerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, unique: true, sparse: true },
    email: { type: String, unique: true, sparse: true },
    address: { type: String, default: "" },
    creditAmount: { type: Number, default: 0 },
    creditLimit: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
    notes: { type: String, default: "" },
  },
  { timestamps: true },
);

export default mongoose.model("Customer", customerSchema);
