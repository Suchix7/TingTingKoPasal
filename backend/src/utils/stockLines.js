import ProductBatch from "../models/ProductBatch.js";
import InventoryTransaction from "../models/InventoryTransaction.js";
import { generateProductBarcode } from "./barcode.js";

// A product's stock can be split into lines: by size (M, L), by colour/style
// (Camo, Tan) or both (Camo / M). Covers can be split by colour and phone
// model (Blue / iPhone 13). Each line is a ProductBatch, so the POS, barcodes
// and sales work on them like on any other batch.

// `size` here is the line's second part: a size or a phone model
export const lineName = (variant, size) =>
  variant && size ? `${variant} / ${size}` : variant || size;

// What a stock line stands for, also for lines saved before colours /
// models were kept apart: { variant, size, model }. A line without parts is a
// phone model (or an ordinary batch) named by its batch number.
export function lineParts(batch) {
  const variant = batch.variant || "";
  const size = batch.size || "";
  const model = batch.model || (!variant && !size ? batch.batchNumber || "" : "");
  return { variant, size, model };
}

// A line renamed by hand (Product Batches page): keep its colour / size /
// model in step with the new name. Lines without parts stay plain.
export function renameLine(batch, name) {
  if (name === batch.batchNumber) return;
  const had = { variant: batch.variant || "", size: batch.size || "", model: batch.model || "" };
  batch.batchNumber = name;
  if (!had.variant && !had.size && !had.model) return;
  const [first, second] = name.split(" / ").map((s) => s.trim());
  if (second !== undefined) {
    batch.variant = first;
    batch.size = had.size ? second : "";
    batch.model = had.size ? "" : second;
  } else if (had.variant && !had.size && !had.model) {
    batch.variant = name;
  } else {
    batch.variant = "";
    batch.size = had.size ? name : "";
    batch.model = had.size ? "" : name;
  }
}

// iPhone 13, iPhone 13 Pro, iPhone 13 Pro Max, iPhone 14, ... (number first,
// then plain < Plus < Pro < Pro Max); anything else alphabetically
const MODEL_TIER = ["", "mini", "e", "plus", "pro", "pro max"];
export function compareModels(a, b) {
  const parse = (s) => {
    const m = String(s).match(/^(.*?)(\d+)\s*(.*)$/);
    return m
      ? { brand: m[1].trim().toLowerCase(), n: Number(m[2]), tier: m[3].trim().toLowerCase() }
      : null;
  };
  const pa = parse(a);
  const pb = parse(b);
  if (pa && pb && pa.brand === pb.brand) {
    if (pa.n !== pb.n) return pa.n - pb.n;
    const ta = MODEL_TIER.indexOf(pa.tier);
    const tb = MODEL_TIER.indexOf(pb.tier);
    if (ta !== -1 && tb !== -1) return ta - tb;
  }
  return String(a).localeCompare(String(b), undefined, { numeric: true });
}

const SIZE_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "2XL", "XXXL", "3XL", "4XL"];

// Sort sizes the way people expect: S, M, L, XL... then numbers, then the rest
export function compareSizes(a, b) {
  const ia = SIZE_ORDER.indexOf(String(a).toUpperCase());
  const ib = SIZE_ORDER.indexOf(String(b).toUpperCase());
  if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  const na = Number(a);
  const nb = Number(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
  return String(a).localeCompare(String(b));
}

// A line's own price: undefined = not sent (keep what is saved), null = use
// the product's price, otherwise the number (NaN when invalid)
const linePrice = (v) => {
  if (v === undefined) return undefined;
  if (v === null || v === "") return null;
  return Number(v);
};

// Body `stock_lines: [{ variant, size | model, quantity, cost_price?,
// sale_price? }]` -> clean list, or an error
export function parseStockLines(raw) {
  if (!Array.isArray(raw)) return { lines: null };
  if (raw.some((l) => String(l?.size ?? "").trim() && String(l?.model ?? "").trim())) {
    return { error: "A stock line has a size or a phone model, not both" };
  }
  const lines = raw
    .map((l) => {
      const variant = String(l?.variant ?? "").trim();
      const size = String(l?.size ?? "").trim();
      const model = String(l?.model ?? "").trim();
      return {
        variant,
        size,
        model,
        name: lineName(variant, size || model),
        quantity: Number(l?.quantity ?? 0),
        costPrice: linePrice(l?.cost_price),
        salePrice: linePrice(l?.sale_price),
      };
    })
    .filter((l) => l.name);

  if (lines.some((l) => [l.variant, l.size, l.model].some((x) => x.includes(" / ")))) {
    return { error: 'Colour, size and model names cannot contain " / "' };
  }
  if (new Set(lines.map((l) => l.name.toLowerCase())).size !== lines.length) {
    return { error: "Each colour, size and model can only be listed once" };
  }
  if (lines.some((l) => !Number.isInteger(l.quantity) || l.quantity < 0)) {
    return { error: "Quantities must be whole numbers, 0 or more" };
  }
  const badPrice = (p) => p != null && (Number.isNaN(p) || p < 0);
  if (lines.some((l) => badPrice(l.costPrice) || badPrice(l.salePrice))) {
    return { error: "Colour / size prices must be numbers, 0 or more" };
  }
  return { lines };
}

// Make the product's stock lines match `lines`: change quantities and
// prices, add new lines and remove ones no longer listed. A line without its
// own price takes the product's. Every stock change is logged.
export async function syncStockLines(product, lines, referenceType = "ADJUSTMENT") {
  const all = await ProductBatch.find({ productId: product._id });
  const byName = new Map(all.map((b) => [b.batchNumber.trim().toLowerCase(), b]));
  const wanted = new Set(lines.map((l) => l.name.toLowerCase()));

  const log = (batch, before, after) =>
    after !== before
      ? InventoryTransaction.create({
          productId: product._id,
          batchId: batch._id,
          type: after > before ? "IN" : "OUT",
          quantity: Math.abs(after - before),
          referenceType,
          referenceId: batch._id,
        })
      : null;

  for (const l of lines) {
    const batch = byName.get(l.name.toLowerCase());
    if (!batch) {
      const created = await ProductBatch.create({
        productId: product._id,
        batchNumber: l.name,
        variant: l.variant,
        size: l.size,
        model: l.model,
        quantity: l.quantity,
        costPrice: l.costPrice ?? product.costPrice,
        salePrice: l.salePrice ?? product.salePrice,
        barcode: await generateProductBarcode(),
      });
      await log(created, 0, l.quantity);
      continue;
    }
    // A previously removed line comes back from 0
    const before = batch.isDeleted ? 0 : Number(batch.quantity || 0);
    batch.isDeleted = false;
    batch.deletedAt = null;
    batch.batchNumber = l.name;
    batch.variant = l.variant;
    batch.size = l.size;
    batch.model = l.model;
    batch.quantity = l.quantity;
    if (l.costPrice !== undefined) batch.costPrice = l.costPrice ?? product.costPrice;
    if (l.salePrice !== undefined) batch.salePrice = l.salePrice ?? product.salePrice;
    await batch.save();
    await log(batch, before, l.quantity);
  }

  for (const batch of all) {
    if (batch.isDeleted || wanted.has(batch.batchNumber.trim().toLowerCase())) continue;
    const before = Number(batch.quantity || 0);
    batch.quantity = 0;
    batch.isDeleted = true;
    batch.deletedAt = new Date();
    await batch.save();
    await log(batch, before, 0);
  }
}
