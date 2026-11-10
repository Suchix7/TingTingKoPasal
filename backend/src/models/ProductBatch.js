import mongoose from "mongoose";

const productBatchSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    batchNumber: { type: String, required: true, trim: true },
    // For products sold by colour/style and/or size the line's parts are kept
    // too (batchNumber is "Camo / M", "Camo" or "M"); empty for phone models
    // and ordinary batches.
    variant: { type: String, default: "", trim: true },
    size: { type: String, default: "", trim: true },
    quantity: { type: Number, required: true, default: 0 },
    costPrice: { type: Number, required: true, min: 0 },
    salePrice: { type: Number, required: true, min: 0 },
    // Auto-generated; lets a scan identify exactly this model/batch
    barcode: { type: String, unique: true, sparse: true },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

productBatchSchema.index({ productId: 1, batchNumber: 1 }, { unique: true });

export default mongoose.model("ProductBatch", productBatchSchema);
