import mongoose from "mongoose";

const productBatchSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    batchNumber: { type: String, required: true, trim: true },
    // For products sold by colour/style and/or size or phone model the line's
    // parts are kept too (batchNumber is "Camo / M", "Camo", "M" or
    // "Blue / iPhone 13"). A line has a size or a phone model, never both.
    // Plain phone-model lines and ordinary batches may leave them empty.
    variant: { type: String, default: "", trim: true },
    size: { type: String, default: "", trim: true },
    // phone model a cover line fits ("iPhone 15 Pro Max")
    model: { type: String, default: "", trim: true },
    // where the line sits in the order set in the stock editor (colours,
    // then sizes / phone models); null for lines saved before that existed,
    // which are put in order by name
    position: { type: Number, default: null },
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
