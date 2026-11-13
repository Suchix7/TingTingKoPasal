import mongoose from "mongoose";
import Product from "../models/Product.js";
import ProductBatch from "../models/ProductBatch.js";
import Category from "../models/Category.js";
import StoreInfo from "../models/StoreInfo.js";
import { productMedia } from "../utils/media.js";
import { compareModels, compareSizes, lineParts } from "../utils/stockLines.js";
import { modelScore, suggestModels, tokenize } from "./search.js";
import { canSeePrices } from "../auth/middleware.js";

// Public, read-only catalog for the customer site. It exposes the photos and videos,
// its category and how many are left (per phone model for cases, a single
// count for accessories): no prices, names, SKUs or barcodes. Sold-out items
// stay listed, marked out of stock, after everything that is available.
// Signed in as the price viewer, selling prices are added too.

// answers with prices depend on the login cookie: never keep them in a shared
// cache (a CDN or proxy) where the public could be served them
const noSharedCache = (res) => {
  res.set("Cache-Control", "private, no-store");
  res.vary("Cookie");
};

const baseFilter = () => ({
  isDeleted: false,
  status: "Active",
  photoUrl: { $nin: [null, ""] },
});

// productId -> [{ model, variant, size, phone, part, quantity }] for every
// stock line (even sold out). `model` is what the filters show: the phone
// model, or the size for colour + size lines (so "M" finds every colour in M,
// "iPhone 13" every colour made for it). `part` is the size or phone model
// shown under a colour.
async function modelsByProduct() {
  const batches = await ProductBatch.find({ isDeleted: false })
    .select("productId batchNumber variant size model quantity salePrice costPrice")
    .lean();

  const map = new Map();
  for (const b of batches) {
    const key = String(b.productId);
    if (!map.has(key)) map.set(key, []);
    const { variant, size, model } = lineParts(b);
    map.get(key).push({
      model: size || model || b.batchNumber,
      variant,
      size,
      phone: model,
      part: size || (variant ? model : ""),
      quantity: Math.max(Number(b.quantity) || 0, 0),
      price: Number(b.salePrice) || 0,
      cost: Number(b.costPrice) || 0,
    });
  }
  return map;
}

const inStockOnly = (entries = []) => entries.filter((m) => m.quantity > 0);

// ids of products that have something to sell, from phone models or own stock
async function inStockProductIds(modelMap) {
  const ids = new Set(
    [...modelMap].filter(([, e]) => inStockOnly(e).length).map(([id]) => id),
  );
  const own = await Product.find({
    ...baseFilter(),
    "stock.currentStock": { $gt: 0 },
  })
    .select("_id")
    .lean();
  own.forEach((p) => ids.add(String(p._id)));
  return ids;
}

// Colours/styles of a product with the sizes (or phone models) left in each.
// Colour order follows the photos; each points at its photo in `media` (-1
// if none).
function variantsOf(media, entries) {
  const names = [];
  const add = (n) => {
    if (n && !names.some((x) => x.toLowerCase() === n.toLowerCase())) names.push(n);
  };
  media.forEach((m) => add(m.variant));
  entries.forEach((e) => add(e.variant));

  return names
    .map((name) => {
      const mine = entries.filter((e) => e.variant.toLowerCase() === name.toLowerCase());
      if (!mine.length) return null; // a labelled photo with no stock line
      const sizes = mine
        .filter((e) => e.part)
        .map((e) => ({ size: e.part, quantity: e.quantity }))
        .sort((a, b) =>
          mine.some((e) => e.size) ? compareSizes(a.size, b.size) : compareModels(a.size, b.size),
        );
      return {
        name,
        media_index: media.findIndex(
          (m) => m.variant.toLowerCase() === name.toLowerCase(),
        ),
        sizes,
        quantity: mine.reduce((sum, e) => sum + e.quantity, 0),
      };
    })
    .filter(Boolean);
}

// lowest and highest selling price of some stock lines (the product's own
// price when it has none)
function priceRange(lines, fallback) {
  const prices = lines.map((e) => e.price).filter((p) => p > 0);
  if (!prices.length) return { price_min: fallback, price_max: fallback };
  return { price_min: Math.min(...prices), price_max: Math.max(...prices) };
}

// the same for cost prices
function costRange(lines, fallback) {
  const costs = lines.map((e) => e.cost).filter((p) => p > 0);
  if (!costs.length) return { cost_min: fallback, cost_max: fallback };
  return { cost_min: Math.min(...costs), cost_max: Math.max(...costs) };
}

// Selling and cost prices for the price viewer, kept apart so the public site
// never gets them: one range for the product, and per model / colour / size.
function withPrices(cover, product, entries) {
  const own = Number(product.salePrice) || 0;
  const ownCost = Number(product.costPrice) || 0;
  // price the range on what is left; everything when it is all sold out
  const left = entries.filter((e) => e.quantity > 0);
  const priced = left.length ? left : entries;
  const linePrices = (lines) => ({
    price: priceRange(lines, own).price_min,
    cost: costRange(lines, ownCost).cost_min,
  });
  return {
    ...cover,
    // the price viewer also sees what each product is called
    name: product.productName || "",
    name_zh: product.productNameZh || "",
    ...priceRange(priced, own),
    ...costRange(priced, ownCost),
    models: cover.models.map((m) => ({
      ...m,
      ...linePrices(entries.filter((e) => e.model.toLowerCase() === m.model.toLowerCase())),
    })),
    variants: cover.variants.map((v) => {
      const mine = entries.filter((e) => e.variant.toLowerCase() === v.name.toLowerCase());
      return {
        ...v,
        ...priceRange(mine, own),
        ...costRange(mine, ownCost),
        sizes: v.sizes.map((s) => ({
          ...s,
          ...linePrices(mine.filter((e) => e.part.toLowerCase() === s.size.toLowerCase())),
        })),
      };
    }),
  };
}

const toCover = (product, entries = [], prices = false) => {
  // one entry per phone model / size; a size held in several colours adds up
  const merged = new Map();
  for (const e of entries) {
    const key = e.model.toLowerCase();
    const m = merged.get(key) || { model: e.model, quantity: 0 };
    m.quantity += e.quantity;
    merged.set(key, m);
  }
  const sized = entries.some((e) => e.size);
  const models = [...merged.values()].sort(
    (a, b) =>
      Number(b.quantity > 0) - Number(a.quantity > 0) ||
      (sized ? compareSizes(a.model, b.model) : compareModels(a.model, b.model)),
  );
  const own = Math.max(Number(product.stock?.currentStock) || 0, 0);
  const quantity = own + entries.reduce((sum, m) => sum + m.quantity, 0);
  const media = productMedia(product);
  const variants = variantsOf(media, entries);
  if (variants.length && !entries.some((e) => e.part)) {
    // colour-only lines: keep the colours in photo order
    const rank = (m) =>
      variants.findIndex((v) => v.name.toLowerCase() === m.model.toLowerCase());
    models.sort(
      (a, b) => Number(b.quantity > 0) - Number(a.quantity > 0) || rank(a) - rank(b),
    );
  }
  const cover = {
    id: String(product._id),
    photo_url: product.photoUrl,
    media: media.map(({ type, url, poster }) => ({ type, url, poster })),
    category_id: product.categoryId ? String(product.categoryId) : null,
    models,
    variants,
    size_guide_index: media.findIndex((m) => m.sizeGuide),
    // stock lines are sizes (S, M, L), whatever the category
    has_sizes: sized,
    // colours split by phone model (Blue: iPhone 13, iPhone 15...)
    has_models: !sized && entries.some((e) => e.phone && e.variant),
    quantity,
    in_stock: quantity > 0,
  };
  return prices ? withPrices(cover, product, entries) : cover;
};

export const getCovers = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 24, 1), 60);
    const category = String(req.query.category || "");
    const q = String(req.query.q || "").trim().toLowerCase();
    const wanted = String(req.query.models || "")
      .split(",")
      .map((m) => m.trim().toLowerCase())
      .filter(Boolean);

    const prices = canSeePrices(req);
    if (prices) noSharedCache(res);
    const modelMap = await modelsByProduct();

    const filter = baseFilter();
    if (category && category !== "All") {
      if (!mongoose.isValidObjectId(category)) {
        return res.json({ success: true, data: [], pagination: { total: 0, hasMore: false } });
      }
      filter.categoryId = new mongoose.Types.ObjectId(category);
    }

    const words = tokenize(q);
    let fuzzy = false;
    let suggestions = [];
    if (words.length > 0 || wanted.length > 0) {
      // a search matches a design name (sold out or not) or a phone model that
      // is still in stock; the model filter only looks at in-stock models
      const scope = await Product.find(filter).select("productName").lean();
      const idsFor = (isFuzzy) =>
        scope
          .filter((p) => {
            const available = inStockOnly(modelMap.get(String(p._id)));
            const models = available.map((m) => m.model);
            const colours = available.map((m) => m.variant).filter(Boolean);
            const matchesSearch =
              words.length === 0 ||
              modelScore(words, p.productName, isFuzzy) !== null ||
              [...models, ...colours].some((m) => modelScore(words, m, isFuzzy) !== null);
            const matchesPick =
              wanted.length === 0 ||
              models.some((m) => wanted.includes(m.toLowerCase()));
            return matchesSearch && matchesPick;
          })
          .map((p) => p._id);

      let ids = idsFor(false);
      if (!ids.length && words.length > 0) {
        // nothing matched as typed: retry forgivingly, and offer "did you mean"
        ids = idsFor(true);
        fuzzy = ids.length > 0;
      }
      if (words.length > 0 && (fuzzy || !ids.length)) {
        const names = scope.flatMap((p) => [
          p.productName,
          ...inStockOnly(modelMap.get(String(p._id))).map((m) => m.model),
        ]);
        suggestions = suggestModels(words, names);
      }
      filter._id = { $in: ids };
    }

    const available = [...(await inStockProductIds(modelMap))].map(
      (id) => new mongoose.Types.ObjectId(id),
    );

    const [products, total] = await Promise.all([
      Product.aggregate([
        { $match: filter },
        { $addFields: { available: { $in: ["$_id", available] } } },
        { $sort: { available: -1, createdAt: -1, _id: 1 } },
        { $skip: (page - 1) * limit },
        { $limit: limit },
        {
          $project: {
            photoUrl: 1,
            "photos.url": 1,
            "photos.type": 1,
            "photos.variant": 1,
            "photos.sizeGuide": 1,
            categoryId: 1,
            "stock.currentStock": 1,
            ...(prices ? { salePrice: 1, costPrice: 1, productName: 1, productNameZh: 1 } : {}),
          },
        },
      ]),
      Product.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: products.map((p) => toCover(p, modelMap.get(String(p._id)), prices)),
      pagination: { total, hasMore: page * limit < total },
      fuzzy,
      suggestions,
    });
  } catch (error) {
    console.error("Catalog covers error:", error);
    return res.status(500).json({ success: false, message: "Failed to load covers" });
  }
};

export const getCover = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ success: false, message: "Cover not found" });
    }
    const product = await Product.findOne({ ...baseFilter(), _id: id })
      .select(
        "photoUrl photos.url photos.type photos.variant photos.sizeGuide categoryId stock.currentStock salePrice costPrice productName productNameZh",
      )
      .lean();
    if (!product) {
      return res.status(404).json({ success: false, message: "Cover not found" });
    }
    const prices = canSeePrices(req);
    if (prices) noSharedCache(res);
    const modelMap = await modelsByProduct();
    return res.json({
      success: true,
      data: toCover(product, modelMap.get(String(product._id)), prices),
    });
  } catch (error) {
    console.error("Catalog cover error:", error);
    return res.status(500).json({ success: false, message: "Failed to load cover" });
  }
};

// Phone models that have at least one cover in stock, with how many covers.
export const getModels = async (req, res) => {
  try {
    const category = String(req.query.category || "");
    const modelMap = await modelsByProduct();
    const filter = { ...baseFilter(), _id: { $in: [...modelMap.keys()] } };
    if (category) {
      if (!mongoose.isValidObjectId(category)) return res.json({ success: true, data: [] });
      filter.categoryId = category;
    }
    const visible = new Set(
      (await Product.find(filter).select("_id").lean()).map((p) => String(p._id)),
    );

    const counts = new Map();
    for (const [productId, entries] of modelMap) {
      if (!visible.has(productId)) continue;
      for (const m of new Set(inStockOnly(entries).map((e) => e.model))) {
        counts.set(m, (counts.get(m) || 0) + 1);
      }
    }

    return res.json({
      success: true,
      data: [...counts].map(([model, count]) => ({ model, count })),
    });
  } catch (error) {
    console.error("Catalog models error:", error);
    return res.status(500).json({ success: false, message: "Failed to load models" });
  }
};

// Categories that have at least one listed item, with a count and a sample
// photo for the menu.
export const getCategories = async (_req, res) => {
  try {
    const modelMap = await modelsByProduct();
    const available = await inStockProductIds(modelMap);

    const products = await Product.find({
      ...baseFilter(),
      categoryId: { $ne: null },
    })
      .select("photoUrl categoryId")
      .sort({ createdAt: -1 })
      .lean();

    const stats = new Map();
    for (const p of products) {
      const key = String(p.categoryId);
      const s = stats.get(key) || { count: 0, photo_url: null };
      s.count += 1;
      // sample photo: prefer something that is actually available
      if (!s.photo_url || (!s.available && available.has(String(p._id)))) {
        s.photo_url = p.photoUrl;
        s.available = available.has(String(p._id));
      }
      stats.set(key, s);
    }

    const categories = await Category.find({ _id: { $in: [...stats.keys()] } })
      .sort({ sortOrder: 1, categoryName: 1 })
      .lean();
    return res.json({
      success: true,
      data: categories.map((c) => ({
        id: String(c._id),
        name: c.categoryName,
        // shown when the price page is read in Chinese
        name_zh: c.categoryNameZh || "",
        count: stats.get(String(c._id)).count,
        photo_url: c.thumbnailUrl || stats.get(String(c._id)).photo_url,
        // stock lines in this category are sizes, not phone models
        has_sizes: (c.sizes || []).length > 0,
      })),
    });
  } catch (error) {
    console.error("Catalog categories error:", error);
    return res.status(500).json({ success: false, message: "Failed to load categories" });
  }
};

// Shop name, location and phone for the customer site header
export const getStore = async (_req, res) => {
  try {
    const store = await StoreInfo.findOne().select("storeName address phone mapUrl").lean();
    return res.json({
      success: true,
      data: {
        name: store?.storeName || "",
        address: store?.address || "",
        phone: store?.phone || "",
        map_url: store?.mapUrl || "",
      },
    });
  } catch (error) {
    console.error("Catalog store error:", error);
    return res.status(500).json({ success: false, message: "Failed to load store" });
  }
};
