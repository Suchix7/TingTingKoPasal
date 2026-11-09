import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    categoryName: { type: String, required: true, unique: true, trim: true },
    categoryNameZh: { type: String, default: "", trim: true },
    description: { type: String, default: "" },
    // customer site: menu thumbnail, and position (lower first)
    thumbnailUrl: { type: String, default: "" },
    thumbnailPublicId: { type: String, default: "" },
    sortOrder: { type: Number, default: 100 },
    // Optional preset sizes (e.g. S, M, L). New products in this category get
    // a quantity box per size; stock itself is kept per product, per size.
    sizes: { type: [String], default: [] },
  },
  { timestamps: true },
);

export default mongoose.model("Category", categorySchema);
