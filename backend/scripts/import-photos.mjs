// Usage: node scripts/import-photos.mjs <extracted-xlsx-dir> [file.csv] [--apply]
// Uploads the photos embedded in the sheet (unzipped .xlsx) to Cloudinary and
// attaches each to the product on the same row. Dry run unless --apply.
// Products that already have a photo are skipped.
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import mongoose from "mongoose";

import Product from "../src/models/Product.js";
import { uploadImageBuffer } from "../src/utils/cloudinaryUpload.js";


const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const apply = process.argv.includes("--apply");
const dir = args[0];
const csv = args[1] || "scripts/data/products.csv";
if (!dir) {
  console.error("Usage: node scripts/import-photos.mjs <extracted-xlsx-dir> [file.csv] [--apply]");
  process.exit(1);
}

// image per sheet row (0-based row index, row 0 is the header)
const drawing = fs.readFileSync(path.join(dir, "xl/drawings/drawing1.xml"), "utf8");
const rels = fs.readFileSync(path.join(dir, "xl/drawings/_rels/drawing1.xml.rels"), "utf8");
const relTarget = new Map(
  [...rels.matchAll(/<Relationship [^>]*?Id="([^"]+)"[^>]*?Target="([^"]+)"/g)].map((m) => [m[1], m[2]]),
);
const imageByRow = new Map();
for (const a of drawing.matchAll(/<xdr:(?:oneCell|twoCell)Anchor>([\s\S]*?)<\/xdr:(?:oneCell|twoCell)Anchor>/g)) {
  const row = a[1].match(/<xdr:from>[\s\S]*?<xdr:row>(\d+)<\/xdr:row>/)?.[1];
  const rid = a[1].match(/r:embed="([^"]+)"/)?.[1];
  if (row !== undefined && rid && relTarget.has(rid)) {
    imageByRow.set(Number(row), path.join(dir, "xl/drawings", relTarget.get(rid)));
  }
}

// product names exactly as import-products.mjs produced them
const lines = fs.readFileSync(csv, "utf8").split(/\r?\n/).slice(1);
const seen = new Map();
const rows = [];
lines.forEach((line, i) => {
  const name = line.split(",")[1]?.trim().replace(/\s+/g, " ");
  if (!name) return;
  const n = (seen.get(name.toLowerCase()) || 0) + 1;
  seen.set(name.toLowerCase(), n);
  rows.push({ row: i + 1, name: n > 1 ? `${name} (${n})` : name });
});

const plan = rows.map((r) => ({ ...r, file: imageByRow.get(r.row) }));
plan.forEach((p) => console.log(`row ${p.row}  ${p.name}  <-  ${p.file ? path.basename(p.file) : "NO PHOTO"}`));
console.log(`${plan.filter((p) => p.file).length} of ${plan.length} rows have a photo`);

if (!apply) {
  console.log("\nDry run only. Re-run with --apply to upload.");
  process.exit(0);
}

await mongoose.connect(process.env.MONGO_URI);
let done = 0;
for (const p of plan) {
  if (!p.file) continue;
  const product = await Product.findOne({ productName: p.name, isDeleted: false });
  if (!product) { console.log(`missing product: ${p.name}`); continue; }
  if (product.photoUrl) { console.log(`skip (has photo): ${p.name}`); continue; }
  const result = await uploadImageBuffer(fs.readFileSync(p.file), { folder: "byapardesk/products" });
  product.photoUrl = result.secure_url;
  product.photoPublicId = result.public_id;
  await product.save();
  done++;
  console.log(`uploaded ${done}: ${p.name}`);
}
console.log(`Done. ${done} photos attached.`);
await mongoose.disconnect();
