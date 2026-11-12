// Usage: node scripts/price-unpriced-lines.mjs [--apply]
// Stock lines (phone models, colours, sizes) saved with a 0 price while their
// product has one, e.g. covers imported before they were priced. The POS
// sells a picked model at its line's price and profit uses the line's cost,
// so these would sell at Rs 0. This gives them the product's price. Lines
// with their own price are left alone. Dry run unless --apply.
import dotenv from "dotenv";
import mongoose from "mongoose";

import Product from "../src/models/Product.js";
import ProductBatch from "../src/models/ProductBatch.js";

dotenv.config();

const apply = process.argv.includes("--apply");

await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);

let count = 0;
for (const p of await Product.find({ isDeleted: false }).lean()) {
  for (const [field, label, price] of [
    ["costPrice", "cost", p.costPrice],
    ["salePrice", "sell", p.salePrice],
  ]) {
    if (!(price > 0)) continue;
    const lines = await ProductBatch.find({ productId: p._id, isDeleted: false, [field]: 0 }).lean();
    if (!lines.length) continue;
    count += lines.length;
    console.log(
      `${apply ? "APPLY" : "PLAN "} ${p.productName}: ${label} 0 -> ${price} on ` +
        lines.map((l) => l.batchNumber).join(", "),
    );
    if (apply) {
      await ProductBatch.updateMany(
        { _id: { $in: lines.map((l) => l._id) } },
        { $set: { [field]: price } },
      );
    }
  }
}

console.log(`${count} line prices ${apply ? "set" : "to set"}.`);
if (!apply) console.log("Dry run. Re-run with --apply to write.");
await mongoose.disconnect();
