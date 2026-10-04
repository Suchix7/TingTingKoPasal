import mongoose from "mongoose";

const saleItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    batchId: { type: mongoose.Schema.Types.ObjectId, ref: "ProductBatch", default: null },
    productName: { type: String, required: true },
    sku: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true },
    discountAmount: { type: Number, default: 0 },
    // Optional note for why an item was sold below its marked price
    discountReason: { type: String, default: "" },
    taxAmount: { type: Number, default: 0 },
    taxInclusive: { type: Boolean, default: false },
    totalPrice: { type: Number, required: true },
    costPrice: { type: Number, required: true },
    profitAmount: { type: Number, required: true },
  },
  { _id: false },
);

const salePaymentSchema = new mongoose.Schema(
  {
    paymentMethodId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PaymentMethod",
      required: true,
    },
    amount: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const saleSchema = new mongoose.Schema(
  {
    invoiceNo: { type: String, required: true, unique: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", default: null },
    customerName: { type: String, default: "" },
    customerPhone: { type: String, default: "" },

    subtotal: { type: Number, required: true },
    discountAmount: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    isTaxInclusive: { type: Boolean, default: false },
    grandTotal: { type: Number, required: true },
    paidAmount: { type: Number, default: 0 },
    changeAmount: { type: Number, default: 0 },
    remainingAmount: { type: Number, default: 0 },
    profitAmount: { type: Number, default: 0 },

    paymentStatus: {
      type: String,
      enum: ["Paid", "Unpaid", "Partial", "Refunded", "Cancelled"],
      default: "Unpaid",
    },
    saleStatus: {
      type: String,
      enum: ["Completed", "Cancelled", "Returned"],
      default: "Completed",
    },
    notes: { type: String, default: "" },

    paymentProofUrl: { type: String, default: null },
    paymentProofPublicId: { type: String, default: null },

    items: { type: [saleItemSchema], default: [] },
    payments: { type: [salePaymentSchema], default: [] },
  },
  { timestamps: true },
);

export default mongoose.model("Sale", saleSchema);
