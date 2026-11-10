import ProductBatch from "../models/ProductBatch.js";
import InventoryTransaction from "../models/InventoryTransaction.js";
import { generateProductBarcode } from "./barcode.js";

// A product's stock can be split into lines: by size (M, L), by colour/style
// (Camo, Tan) or both (Camo / M). Each line is a ProductBatch, so the POS,
// barcodes and sales work on them like on any other batch.

export const lineName = (variant, size) =>
  variant && size ? `${variant} / ${size}` : variant || size;

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

// Body `stock_lines: [{ variant, size, quantity }]` -> clean list, or an error
export function parseStockLines(raw) {
  if (!Array.isArray(raw)) return { lines: null };
  const lines = raw
    .map((l) => {
      const variant = String(l?.variant ?? "").trim();
      const size = String(l?.size ?? "").trim();
      return { variant, size, name: lineName(variant, size), quantity: Number(l?.quantity ?? 0) };
    })
    .filter((l) => l.name);

  if (lines.some((l) => l.variant.includes(" / ") || l.size.includes(" / "))) {
    return { error: 'Colour and size names cannot contain " / "' };
  }
  if (new Set(lines.map((l) => l.name.toLowerCase())).size !== lines.length) {
    return { error: "Each colour and size can only be listed once" };
  }
  if (lines.some((l) => !Number.isInteger(l.quantity) || l.quantity < 0)) {
    return { error: "Quantities must be whole numbers, 0 or more" };
  }
  return { lines };
}

// Make the product's stock lines match `lines`: change quantities, add new
// lines and remove ones no longer listed. Every change is logged.
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
        quantity: l.quantity,
        costPrice: product.costPrice,
        salePrice: product.salePrice,
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
    batch.quantity = l.quantity;
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
