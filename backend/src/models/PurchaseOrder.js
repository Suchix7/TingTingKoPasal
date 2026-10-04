import mongoose from "mongoose";

const purchaseOrderItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    batchId: { type: mongoose.Schema.Types.ObjectId, ref: "ProductBatch", default: null },
    quantity: { type: Number, required: true, min: 1 },
    unitCost: { type: Number, required: true },
    totalCost: { type: Number, required: true },
  },
  { _id: false },
);

const purchaseOrderPaymentSchema = new mongoose.Schema(
  {
    paymentMethodId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PaymentMethod",
      required: true,
    },
    amount: { type: Number, required: true },
    paymentDate: { type: Date, default: Date.now },
    notes: { type: String, default: "" },
  },
  { _id: false },
);

const purchaseOrderSchema = new mongoose.Schema(
  {
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier", default: null },
    orderDate: { type: Date, default: Date.now },
    totalCost: { type: Number, required: true },
    orderingCost: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["Pending", "Received", "Cancelled"],
      default: "Pending",
    },
    notes: { type: String, default: "" },
    items: { type: [purchaseOrderItemSchema], default: [] },
    payments: { type: [purchaseOrderPaymentSchema], default: [] },
  },
  { timestamps: true },
);

export default mongoose.model("PurchaseOrder", purchaseOrderSchema);
