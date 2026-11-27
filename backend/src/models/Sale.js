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
    customerAddress: { type: String, default: "" },

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
      // "Pending" = Cash on Delivery order: the goods have left the shop
      // (stock is out) but the money has not been collected yet.
      enum: ["Pending", "Completed", "Cancelled", "Returned"],
      default: "Completed",
    },
    // Cash on Delivery order. Stays true after it is completed, so COD
    // orders can always be told apart from counter sales.
    isCod: { type: Boolean, default: false },
    // When a pending COD order was paid and marked Completed
    completedAt: { type: Date, default: null },
    notes: { type: String, default: "" },

    paymentProofUrl: { type: String, default: null },
    paymentProofPublicId: { type: String, default: null },

    items: { type: [saleItemSchema], default: [] },
    payments: { type: [salePaymentSchema], default: [] },
  },
  { timestamps: true },
);

saleSchema.index({ saleStatus: 1, createdAt: -1 });

export default mongoose.model("Sale", saleSchema);
