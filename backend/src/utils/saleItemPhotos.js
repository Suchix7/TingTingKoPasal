import Product from "../models/Product.js";
import ProductBatch from "../models/ProductBatch.js";
import { productMedia } from "./media.js";

// Adds `photo_url` (the sold colour's photo, else the product's cover) and
// `batch_number` (e.g. "Blue / iPhone 13") to serialized sale items, so sale
// lists and bills can show what was sold. Works on any list of items that
// carry product_id / batch_id; looks everything up in two queries.
export async function attachItemPhotos(items) {
  if (!items.length) return items;
  const productIds = [...new Set(items.map((i) => i.product_id).filter(Boolean))];
  const batchIds = [...new Set(items.map((i) => i.batch_id).filter(Boolean))];
  const [products, batches] = await Promise.all([
    Product.find({ _id: { $in: productIds } })
      .select("photos photoUrl photoPublicId")
      .lean(),
    batchIds.length
      ? ProductBatch.find({ _id: { $in: batchIds } })
          .select("batchNumber variant")
          .lean()
      : [],
  ]);
  const productById = new Map(products.map((p) => [String(p._id), p]));
  const batchById = new Map(batches.map((b) => [String(b._id), b]));

  for (const item of items) {
    const product = productById.get(String(item.product_id));
    const batch = item.batch_id ? batchById.get(String(item.batch_id)) : null;
    const media = product ? productMedia(product).filter((m) => !m.sizeGuide) : [];
    const variant = batch?.variant?.trim().toLowerCase();
    const own = variant
      ? media.find((m) => m.variant?.trim().toLowerCase() === variant)
      : null;
    item.photo_url = own?.poster || media[0]?.poster || product?.photoUrl || null;
    item.batch_number = batch?.batchNumber || null;
  }
  return items;
}

// Same for whole serialized sales
export async function attachSalePhotos(sales) {
  await attachItemPhotos(sales.flatMap((s) => s.items || []));
  return sales;
}
