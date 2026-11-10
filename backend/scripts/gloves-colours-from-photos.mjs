// Usage: node scripts/gloves-colours-from-photos.mjs [--apply]
// The glove products show one colour per photo plus a size-guide photo last.
// Their description ("M-1\nL-1\nXL-1\n\nEach") gives the quantity of each
// size for each colour. This tags the photos (colour name / size guide) and
// replaces the size-only stock lines with colour + size lines
// (e.g. "Camo / M" = 1). Totals must match the current stock or the product
// is skipped. Dry run unless --apply.
import dotenv from "dotenv";
import mongoose from "mongoose";

import Product from "../src/models/Product.js";
import ProductBatch from "../src/models/ProductBatch.js";
import Category from "../src/models/Category.js";
import { lineName, syncStockLines } from "../src/utils/stockLines.js";

dotenv.config();

const apply = process.argv.includes("--apply");

// Colours in photo order, read off the photos
const COLOURS = {
  "Bicycle gloves": ["Camo", "Olive Green", "Tan"],
  "4 season gloves": ["Grey", "Red"],
  "Leather gloves": ["Black", "Yellow", "White"],
  "Electrical heating gloves for winter": ["Black"],
  "Winter waterproof gloves, extended length": ["Black", "Black Red"],
};
const SIZE_LINE = /^\s*(XXXL|XXL|XL|L|M|S|XS|\d+)\s*[-:=]\s*(\d+)\s*$/i;

await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);

const category = await Category.findOne({ categoryName: "Gloves" }).lean();
if (!category) throw new Error('Category "Gloves" not found');

const products = await Product.find({ categoryId: category._id, isDeleted: false });

for (const p of products) {
  const colours = COLOURS[p.productName];
  if (!colours) {
    console.log(`SKIP  ${p.productName}: no colour list`);
    continue;
  }
  if (p.photos.length !== colours.length + 1) {
    console.log(`SKIP  ${p.productName}: expected ${colours.length + 1} photos, has ${p.photos.length}`);
    continue;
  }

  const sizes = String(p.description || "")
    .split(/\r?\n/)
    .map((line) => line.match(SIZE_LINE))
    .filter(Boolean)
    .map((m) => ({ size: m[1].toUpperCase(), quantity: Number(m[2]) }));

  const lines = colours.flatMap((variant) =>
    sizes.map(({ size, quantity }) => ({
      variant,
      size,
      name: lineName(variant, size),
      quantity,
    })),
  );

  const batches = await ProductBatch.find({ productId: p._id, isDeleted: { $ne: true } }).lean();
  const current =
    Number(p.stock?.currentStock || 0) + batches.reduce((s, b) => s + Number(b.quantity || 0), 0);
  const total = lines.reduce((s, l) => s + l.quantity, 0);

  console.log(
    `${apply ? "APPLY" : "PLAN "} ${p.productName}: ${current} in stock -> ` +
      colours.map((c) => `${c} [${sizes.map((s) => `${s.size}=${s.quantity}`).join(" ")}]`).join(", ") +
      ` + size guide (total ${total})`,
  );
  if (total !== current) {
    console.log(`      ! total ${total} does not match stock ${current}; skipped`);
    continue;
  }
  if (!apply) continue;

  p.photos.forEach((photo, i) => {
    photo.sizeGuide = i === colours.length;
    photo.variant = colours[i] || "";
  });
  await p.save();
  await syncStockLines(p, lines, "SPLIT_BY_COLOUR");
}

if (!apply) console.log("Dry run. Re-run with --apply to write.");
await mongoose.disconnect();
