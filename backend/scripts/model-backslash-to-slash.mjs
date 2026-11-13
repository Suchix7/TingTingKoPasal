// Usage: node scripts/model-backslash-to-slash.mjs [--apply]
// Phone models and sizes typed with "\" ("iPhone 13\14\15") switch to "/"
// ("iPhone 13/14/15"), the same as the app now saves them. Dry run unless --apply.
import dotenv from "dotenv";
import mongoose from "mongoose";

import ProductBatch from "../src/models/ProductBatch.js";
import Category from "../src/models/Category.js";
import { cleanSize, lineName } from "../src/utils/stockLines.js";

dotenv.config();

const apply = process.argv.includes("--apply");
const BS = String.fromCharCode(92);
const hasBS = new RegExp(BS + BS);

await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);

const batches = await ProductBatch.find({
  $or: [{ model: hasBS }, { size: hasBS }, { batchNumber: hasBS }],
});
let changed = 0;
let skipped = 0;
for (const b of batches) {
  const model = cleanSize(b.model);
  const size = cleanSize(b.size);
  const name = b.model || b.size ? lineName(b.variant, size || model) : cleanSize(b.batchNumber);
  // another line of the product already uses the new name
  const clash = await ProductBatch.findOne({
    _id: { $ne: b._id },
    productId: b.productId,
    isDeleted: { $ne: true },
    batchNumber: name,
  }).lean();
  if (clash && !b.isDeleted) {
    console.log(`SKIP ${b.batchNumber} -> ${name} (already exists)`);
    skipped++;
    continue;
  }
  console.log(`${b.batchNumber} -> ${name}${b.isDeleted ? " (removed line)" : ""}`);
  if (apply) {
    b.model = model;
    b.size = size;
    b.batchNumber = name;
    await b.save();
  }
  changed++;
}

const cats = await Category.find({ sizes: hasBS });
for (const c of cats) {
  const sizes = c.sizes.map(cleanSize);
  console.log(`Category ${c.categoryName}: ${c.sizes.join(", ")} -> ${sizes.join(", ")}`);
  if (apply) {
    c.sizes = sizes;
    await c.save();
  }
}

console.log(
  `${apply ? "Updated" : "Would update"} ${changed} lines, ${cats.length} categories` +
    (skipped ? `, skipped ${skipped}` : "") +
    (apply ? "" : ". Run with --apply to save."),
);
await mongoose.disconnect();
