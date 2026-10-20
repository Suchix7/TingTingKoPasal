// Usage: node scripts/import-products.mjs [file.csv] [--apply]
// Imports phone covers (Name, Model, Stock, Cost Price, Selling Price) as
// products with one stock line per phone model. Dry run unless --apply.
// Safe to re-run: products whose name already exists are skipped.
import dotenv from "dotenv";
import fs from "node:fs";
import mongoose from "mongoose";

import Product from "../src/models/Product.js";
import ProductBatch from "../src/models/ProductBatch.js";
import Category from "../src/models/Category.js";
import InventoryTransaction from "../src/models/InventoryTransaction.js";
import { generateProductBarcode } from "../src/utils/barcode.js";

dotenv.config();

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const file = args.find((a) => !a.startsWith("--")) || "scripts/data/products.csv";
const CATEGORY = "Phone Cover";

function parseCsv(text) {
  const rows = [];
  let row = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((v) => v.trim())) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((v) => v.trim())) rows.push(row);
  return rows;
}

// "15pm" -> "iPhone 15 Pro Max", "16plus" -> "iPhone 16 Plus", "17" -> "iPhone 17"
const SUFFIX = { pm: "Pro Max", promax: "Pro Max", pro: "Pro", plus: "Plus", mini: "mini", e: "e" };
function normalizeModel(token) {
  const t = token.toLowerCase().replace(/iphone/g, "").replace(/\s+/g, "");
  const m = t.match(/^(\d+)(pm|promax|pro|plus|mini|e)?$/);
  if (!m) return null;
  const suffix = m[2] ? SUFFIX[m[2]] : "";
  const sep = suffix === "e" ? "" : " ";
  return `iPhone ${m[1]}${suffix ? sep + suffix : ""}`;
}

const [header, ...data] = parseCsv(fs.readFileSync(file, "utf8"));
const col = (name) => header.findIndex((h) => h.trim().toLowerCase() === name);
const iName = col("name"), iModel = col("model"), iStock = col("stock");
const iCost = col("cost price"), iSale = col("selling price");

const problems = [];
const items = [];
const seen = new Map();

data.forEach((r, n) => {
  const line = n + 2;
  let name = (r[iName] || "").trim().replace(/\s+/g, " ");
  if (!name) return;

  const tokens = (r[iModel] || "").split("/").map((s) => s.trim()).filter(Boolean);
  const models = tokens.map(normalizeModel);
  if (!tokens.length || models.includes(null)) {
    problems.push(`line ${line} "${name}": can't read model "${r[iModel]}"`);
    return;
  }
  // "1.1.1" = one pair per model; a single number applies to every model
  const qtys = (r[iStock] || "").split(".").map((s) => s.trim()).filter(Boolean).map(Number);
  if (qtys.some((q) => !Number.isInteger(q))) {
    problems.push(`line ${line} "${name}": can't read stock "${r[iStock]}"`);
    return;
  }
  if (qtys.length !== models.length) {
    problems.push(`line ${line} "${name}": ${models.length} models but stock "${r[iStock]}"`);
    return;
  }
  const variants = new Map();
  models.forEach((model, i) => variants.set(model, (variants.get(model) || 0) + qtys[i]));

  // product names are unique: a repeated name gets a number
  const key = name.toLowerCase();
  const count = (seen.get(key) || 0) + 1;
  seen.set(key, count);
  if (count > 1) name = `${name} (${count})`;

  items.push({
    name,
    variants: [...variants].map(([model, quantity]) => ({ model, quantity })),
    cost: Number(r[iCost]) || 0,
    sale: Number(r[iSale]) || 0,
    line,
  });
});

console.log(`${items.length} products ready, ${problems.length} problems`);
problems.forEach((p) => console.log("  PROBLEM", p));
for (const it of items) {
  console.log(`  ${it.name}: ${it.variants.map((v) => `${v.model} x${v.quantity}`).join(", ")}`);
}

if (!apply) {
  console.log("\nDry run only. Re-run with --apply to write to the database.");
  process.exit(problems.length ? 1 : 0);
}
if (problems.length) {
  console.log("\nFix the problems above first.");
  process.exit(1);
}

await mongoose.connect(process.env.MONGO_URI);
const category =
  (await Category.findOne({ categoryName: CATEGORY })) ||
  (await Category.create({ categoryName: CATEGORY, description: "Mobile phone covers" }));

let created = 0, skipped = 0;
for (const it of items) {
  if (await Product.findOne({ productName: it.name })) {
    console.log(`skip (exists): ${it.name}`);
    skipped++;
    continue;
  }
  const barcode = await generateProductBarcode();
  const product = await Product.create({
    productName: it.name,
    sku: `SKU-${barcode}`,
    categoryId: category._id,
    costPrice: it.cost,
    salePrice: it.sale,
    unit: "Piece",
    status: "Active",
    barcode,
    stock: { currentStock: 0, reorderLevel: 0, reorderQuantity: 0, lastRestockedAt: new Date() },
  });
  for (const v of it.variants) {
    const batch = await ProductBatch.create({
      productId: product._id,
      batchNumber: v.model,
      quantity: v.quantity,
      costPrice: it.cost,
      salePrice: it.sale,
      barcode: await generateProductBarcode(),
    });
    if (v.quantity > 0) {
      await InventoryTransaction.create({
        productId: product._id,
        batchId: batch._id,
        type: "IN",
        quantity: v.quantity,
        referenceType: "CREATE_BATCH",
      });
    }
  }
  created++;
}
console.log(`\nDone. Created ${created}, skipped ${skipped}. DB: ${mongoose.connection.db.databaseName}`);
await mongoose.disconnect();
