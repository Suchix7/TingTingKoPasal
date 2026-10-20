// Usage: node scripts/stock-floor-one.mjs [--apply]
// Phone-cover phone models (batches) with 0 stock are raised to 1, so they show
// on the customer site and drop off again once sold. Dry run unless --apply.
import dotenv from "dotenv";
import mongoose from "mongoose";

import Product from "../src/models/Product.js";
import ProductBatch from "../src/models/ProductBatch.js";
import Category from "../src/models/Category.js";

dotenv.config();

const apply = process.argv.includes("--apply");
const CATEGORY = "Mobile Case";

await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);

const category = await Category.findOne({ categoryName: CATEGORY }).lean();
if (!category) throw new Error(`Category "${CATEGORY}" not found`);

const products = await Product.find({ categoryId: category._id, isDeleted: false })
  .select("_id")
  .lean();
const filter = {
  productId: { $in: products.map((p) => p._id) },
  isDeleted: { $ne: true },
  quantity: { $lt: 1 },
};

const total = await ProductBatch.countDocuments({
  productId: filter.productId,
  isDeleted: { $ne: true },
});
const zero = await ProductBatch.countDocuments(filter);
console.log(`${products.length} phone-cover products, ${total} phone models, ${zero} at 0 stock`);

if (apply) {
  const r = await ProductBatch.updateMany(filter, { $set: { quantity: 1 } });
  console.log(`Updated ${r.modifiedCount} phone models to quantity 1`);
} else {
  console.log("Dry run. Re-run with --apply to write.");
}
await mongoose.disconnect();
