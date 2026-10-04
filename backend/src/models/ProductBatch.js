import mongoose from "mongoose";

const productBatchSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    batchNumber: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, default: 0 },
    costPrice: { type: Number, required: true, min: 0 },
    salePrice: { type: Number, required: true, min: 0 },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

productBatchSchema.index({ productId: 1, batchNumber: 1 }, { unique: true });

export default mongoose.model("ProductBatch", productBatchSchema);
