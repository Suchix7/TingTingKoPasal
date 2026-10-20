import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    categoryName: { type: String, required: true, unique: true, trim: true },
    description: { type: String, default: "" },
    // customer site: menu thumbnail, and position (lower first)
    thumbnailUrl: { type: String, default: "" },
    thumbnailPublicId: { type: String, default: "" },
    sortOrder: { type: Number, default: 100 },
  },
  { timestamps: true },
);

export default mongoose.model("Category", categorySchema);
