import Counter from "../models/Counter.js";

const INTERNAL_PREFIX = "200"; // GS1 reserved range for internal/in-store use

function computeEAN13CheckDigit(digits12) {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = Number(digits12[i]);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  const remainder = sum % 10;
  return remainder === 0 ? 0 : 10 - remainder;
}

export function buildEAN13(sequence) {
  const body = INTERNAL_PREFIX + String(sequence).padStart(9, "0");
  const checkDigit = computeEAN13CheckDigit(body);
  return body + checkDigit;
}

export function isValidEAN13(code) {
  if (!/^\d{13}$/.test(code)) return false;
  return computeEAN13CheckDigit(code.slice(0, 12)) === Number(code[12]);
}

// Products and batches draw from the same counter, so a code is never reused
// across the two and a scan resolves to exactly one of them.
export async function generateProductBarcode() {
  const counter = await Counter.findByIdAndUpdate(
    "product_barcode",
    { $inc: { seq: 1 } },
    { upsert: true, new: true },
  );
  return buildEAN13(counter.seq);
}
