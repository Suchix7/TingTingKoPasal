// Usage: node scripts/colours-from-photos.mjs [--apply]
// Products added before colours existed show one colour per photo (plus, for
// gloves, a size-guide photo last), with the per-colour quantity written in
// the description:
//   gloves: "M-1\nL-1\nXL-1\n\nEach"  -> each colour has M 1, L 1, XL 1
//   caps:   "2 pieces per color"     -> each colour has 2 (no sizes)
// This tags the photos (colour name / size guide) and replaces the stock with
// one line per colour (and size), e.g. "Camo / M" = 1 or "Grey" = 2. Totals
// must match the current stock or the product is skipped, and products that
// already have colour lines are left alone. Dry run unless --apply.
import dotenv from "dotenv";
import mongoose from "mongoose";

import Product from "../src/models/Product.js";
import ProductBatch from "../src/models/ProductBatch.js";
import Category from "../src/models/Category.js";
import InventoryTransaction from "../src/models/InventoryTransaction.js";
import { lineName, syncStockLines } from "../src/utils/stockLines.js";

dotenv.config();

const apply = process.argv.includes("--apply");

// Colours in photo order, read off the photos. `sizeGuide`: the last photo
// is the size chart.
const CATALOG = {
  Gloves: {
    sizeGuide: true,
    products: {
      "Bicycle gloves": ["Camo", "Olive Green", "Tan"],
      "4 season gloves": ["Grey", "Red"],
      "Leather gloves": ["Black", "Yellow", "White"],
      "Electrical heating gloves for winter": ["Black"],
      "Winter waterproof gloves, extended length": ["Black", "Black Red"],
    },
  },
  Caps: {
    sizeGuide: false,
    products: {
      "Lei fend hat with glasses": ["Brown", "Grey", "Charcoal", "Black"],
      "Lei fend hat": ["Brown", "Grey", "Charcoal", "Black"],
      "Woollen dog beanie": ["Dark Brown", "Grey", "Cream"],
    },
  },
};

const SIZE_LINE = /^\s*(XXXL|XXL|XL|L|M|S|XS|\d+)\s*[-:=]\s*(\d+)\s*$/i;
const PER_COLOUR = /(\d+)\s*(?:pcs?|pieces?)?\s*(?:per|each|\/)\s*colou?r/i;

// Sizes and quantity per colour from the description
function perColour(description) {
  const text = String(description || "");
  const sizes = text
    .split(/\r?\n/)
    .map((line) => line.match(SIZE_LINE))
    .filter(Boolean)
    .map((m) => ({ size: m[1].toUpperCase(), quantity: Number(m[2]) }));
  if (sizes.length) return sizes;
  const m = text.match(PER_COLOUR);
  return m ? [{ size: "", quantity: Number(m[1]) }] : null;
}

await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);

for (const [categoryName, { sizeGuide, products: colourMap }] of Object.entries(CATALOG)) {
  const category = await Category.findOne({ categoryName }).lean();
  if (!category) {
    console.log(`SKIP  category "${categoryName}" not found`);
    continue;
  }
  const products = await Product.find({ categoryId: category._id, isDeleted: false });

  for (const p of products) {
    const colours = colourMap[p.productName];
    if (!colours) {
      console.log(`SKIP  ${p.productName}: no colour list`);
      continue;
    }
    const batches = await ProductBatch.find({ productId: p._id, isDeleted: { $ne: true } }).lean();
    if (batches.some((b) => b.variant)) {
      console.log(`DONE  ${p.productName}: already split by colour`);
      continue;
    }
    const photosNeeded = colours.length + (sizeGuide ? 1 : 0);
    if (p.photos.length !== photosNeeded) {
      console.log(`SKIP  ${p.productName}: expected ${photosNeeded} photos, has ${p.photos.length}`);
      continue;
    }
    const each = perColour(p.description);
    if (!each) {
      console.log(`SKIP  ${p.productName}: description has no per-colour quantity`);
      continue;
    }

    const lines = colours.flatMap((variant) =>
      each.map(({ size, quantity }) => ({ variant, size, name: lineName(variant, size), quantity })),
    );
    const current =
      Number(p.stock?.currentStock || 0) + batches.reduce((s, b) => s + Number(b.quantity || 0), 0);
    const total = lines.reduce((s, l) => s + l.quantity, 0);
    const desc = each.map((e) => (e.size ? `${e.size}=${e.quantity}` : `${e.quantity}`)).join(" ");

    console.log(
      `${apply ? "APPLY" : "PLAN "} ${p.productName}: ${current} in stock -> ` +
        colours.map((c) => `${c} [${desc}]`).join(", ") +
        `${sizeGuide ? " + size guide" : ""} (total ${total})`,
    );
    if (total !== current) {
      console.log(`      ! total ${total} does not match stock ${current}; skipped`);
      continue;
    }
    if (!apply) continue;

    p.photos.forEach((photo, i) => {
      photo.sizeGuide = sizeGuide && i === colours.length;
      photo.variant = colours[i] || "";
    });
    await p.save();
    await syncStockLines(p, lines, "SPLIT_BY_COLOUR");

    // the product's own stock moves onto the colour lines
    if (Number(p.stock?.currentStock || 0) > 0) {
      await InventoryTransaction.create({
        productId: p._id,
        type: "OUT",
        quantity: Number(p.stock.currentStock),
        referenceType: "SPLIT_BY_COLOUR",
      });
      p.stock.currentStock = 0;
      await p.save();
    }
  }
}

if (!apply) console.log("Dry run. Re-run with --apply to write.");
await mongoose.disconnect();
