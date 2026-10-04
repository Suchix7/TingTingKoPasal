import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    productName: { type: String, required: true, trim: true },
    sku: { type: String, required: true, unique: true, trim: true },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    costPrice: { type: Number, required: true, min: 0 },
    salePrice: { type: Number, required: true, min: 0 },
    unit: {
      type: String,
      enum: ["Piece", "Kg", "Liter", "Box"],
      default: "Piece",
    },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
    description: { type: String, default: "" },

    barcode: { type: String, unique: true, sparse: true },
    previousBarcodes: { type: [String], default: [] },
    barcodeLabel: {
      lastPrintedAt: { type: Date, default: null },
      lastPrintedQuantity: { type: Number, default: 0 },
    },

    photoUrl: { type: String, default: null },
    photoPublicId: { type: String, default: null },

    stock: {
      currentStock: { type: Number, default: 0 },
      reorderLevel: { type: Number, default: 0 },
      reorderQuantity: { type: Number, default: 0 },
      lastRestockedAt: { type: Date, default: null },
    },

    costs: {
      holdingCostPerUnit: { type: Number, default: 0 },
      storageCost: { type: Number, default: 0 },
      insuranceCost: { type: Number, default: 0 },
      spoilageRate: { type: Number, default: 0 },
    },

    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export default mongoose.model("Product", productSchema);
