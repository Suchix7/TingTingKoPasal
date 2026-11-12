// Usage: node scripts/merge-colour-products.mjs [--apply]
// Some covers were added as one product per colour ("Blue bear", "Pink
// bear"...) or per half of a couple case ("Boy ok", "Girl ok"). This merges
// each group into one product with a colour / style per
// photo and one stock line per colour × phone model ("Blue / iPhone 13").
// The first product listed is kept (its barcode, SKU and sales); the others'
// stock lines move over with their quantities, prices and printed barcodes,
// their product barcodes still scan (as retired codes) and they are
// removed. Dry run unless --apply. Safe to re-run: merged groups are skipped.
import dotenv from "dotenv";
import mongoose from "mongoose";

import Product from "../src/models/Product.js";
import ProductBatch from "../src/models/ProductBatch.js";
import Sale from "../src/models/Sale.js";
import InventoryTransaction from "../src/models/InventoryTransaction.js";
import { lineName, lineParts } from "../src/utils/stockLines.js";

dotenv.config();

const apply = process.argv.includes("--apply");

// new name, Chinese name, then [current product, colour] in photo order;
// colours read off the photos
const GROUPS = [
  {
    name: "Bear",
    nameZh: "小熊",
    members: [
      ["Blue bear", "Blue"],
      ["Pink bear", "Pink"],
      ["Brown bear", "Brown"],
    ],
  },
  {
    name: "Hairy leather",
    nameZh: "毛绒皮革",
    members: [
      ["Hairy leather green", "Green"],
      ["Hairy leather green (2)", "Blue"],
    ],
  },
  {
    // Yellow first: it has a sale on it
    name: "Christmas",
    nameZh: "圣诞",
    members: [
      ["Yellow Christmas", "Yellow"],
      ["White christmas", "White"],
    ],
  },
  // couple cases: one case, two matching styles
  {
    name: "OK couple",
    nameZh: "OK 情侣款",
    members: [
      ["Boy ok", "Boy"],
      ["Girl ok", "Girl"],
    ],
  },
  {
    name: "Judy & Fox couple",
    nameZh: "朱迪和狐狸情侣款",
    members: [
      ["Judy", "Judy"],
      ["Fox", "Fox"],
    ],
  },
];

await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);

for (const group of GROUPS) {
  const members = [];
  for (const [productName, colour] of group.members) {
    const product = await Product.findOne({ productName, isDeleted: false });
    members.push({ productName, colour, product });
  }
  const missing = members.filter((m) => !m.product);
  if (missing.length) {
    const merged = await Product.findOne({ productName: group.name, isDeleted: false });
    console.log(
      merged
        ? `DONE  ${group.name}: already merged`
        : `SKIP  ${group.name}: not found: ${missing.map((m) => m.productName).join(", ")}`,
    );
    continue;
  }
  const [keep, ...others] = members;
  if (others.some((m) => String(m.product.categoryId) !== String(keep.product.categoryId))) {
    console.log(`SKIP  ${group.name}: products are in different categories`);
    continue;
  }

  // a sale must stay linked to its product: only the kept one may have sales
  let blocked = false;
  for (const m of others) {
    const sales = await Sale.countDocuments({ "items.productId": m.product._id });
    if (sales) {
      console.log(`SKIP  ${group.name}: "${m.productName}" has ${sales} sale(s); list it first`);
      blocked = true;
    }
  }
  if (blocked) continue;

  // every stock line becomes colour / phone model
  const moves = [];
  for (const m of members) {
    if (Number(m.product.stock?.currentStock || 0) !== 0) {
      console.log(`SKIP  ${group.name}: "${m.productName}" has stock not on a phone model`);
      blocked = true;
    }
    const batches = await ProductBatch.find({ productId: m.product._id });
    for (const b of batches) {
      const parts = lineParts(b);
      if (parts.variant || parts.size || !parts.model) {
        console.log(`SKIP  ${group.name}: "${m.productName}" line "${b.batchNumber}" is not a phone model`);
        blocked = true;
      }
      moves.push({ batch: b, colour: m.colour, model: parts.model, from: m });
    }
  }
  if (blocked) continue;

  const photos = members.flatMap((m) => {
    const own = (m.product.photos || []).map((p) => ({ ...p.toObject(), variant: m.colour }));
    if (own.length) return own;
    return m.product.photoUrl
      ? [{ type: "image", url: m.product.photoUrl, publicId: m.product.photoPublicId, variant: m.colour }]
      : [];
  });

  console.log(
    `${apply ? "APPLY" : "PLAN "} ${members.map((m) => `"${m.productName}"`).join(" + ")} -> "${group.name}" ` +
      `(kept: "${keep.productName}", ${photos.length} photos)`,
  );
  for (const mv of moves) {
    const live = mv.batch.isDeleted ? " (removed line)" : "";
    console.log(`      ${lineName(mv.colour, mv.model)} = ${mv.batch.quantity}${live}  [sticker ${mv.batch.barcode}]`);
  }
  if (!apply) continue;

  for (const mv of moves) {
    mv.batch.productId = keep.product._id;
    mv.batch.batchNumber = lineName(mv.colour, mv.model);
    mv.batch.variant = mv.colour;
    mv.batch.size = "";
    mv.batch.model = mv.model;
    await mv.batch.save();
  }

  for (const m of others) {
    await InventoryTransaction.updateMany(
      { productId: m.product._id },
      { $set: { productId: keep.product._id } },
    );
  }

  const p = keep.product;
  p.productName = group.name;
  p.productNameZh = group.nameZh;
  p.photos = photos;
  p.photoUrl = photos[0]?.url ?? p.photoUrl;
  p.photoPublicId = photos[0]?.publicId ?? p.photoPublicId;
  p.previousBarcodes = [
    ...(p.previousBarcodes || []),
    ...others.flatMap((m) => [m.product.barcode, ...(m.product.previousBarcodes || [])]).filter(Boolean),
  ];
  await p.save();

  // the merged-away products: their photos now belong to the kept one, so
  // they no longer point at them (nothing can delete the files through them)
  for (const m of others) {
    await Product.updateOne(
      { _id: m.product._id },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
          photos: [],
          photoUrl: null,
          photoPublicId: null,
          previousBarcodes: [],
          description: `Merged into "${group.name}" (${m.colour})`,
        },
        $unset: { barcode: "" },
      },
    );
  }
}

if (!apply) console.log("Dry run. Re-run with --apply to write.");
await mongoose.disconnect();
