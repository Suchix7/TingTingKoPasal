import mongoose from "mongoose";
import Product from "../models/Product.js";
import ProductBatch from "../models/ProductBatch.js";
import Category from "../models/Category.js";
import StoreInfo from "../models/StoreInfo.js";
import { modelScore, suggestModels, tokenize } from "./search.js";

// Public, read-only catalog for the customer site. It exposes the cover photo,
// its category and how many are left (per phone model for cases, a single
// count for accessories): no prices, names, SKUs or barcodes. Sold-out items
// stay listed, marked out of stock, after everything that is available.

const baseFilter = () => ({
  isDeleted: false,
  status: "Active",
  photoUrl: { $nin: [null, ""] },
});

// productId -> [{ model, quantity }] for every phone model (even sold out)
async function modelsByProduct() {
  const batches = await ProductBatch.find({ isDeleted: false })
    .select("productId batchNumber quantity")
    .lean();

  const map = new Map();
  for (const b of batches) {
    const key = String(b.productId);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push({
      model: b.batchNumber,
      quantity: Math.max(Number(b.quantity) || 0, 0),
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

const toCover = (product, entries) => {
  const models = [...(entries || [])].sort(
    (a, b) =>
      Number(b.quantity > 0) - Number(a.quantity > 0) ||
      a.model.localeCompare(b.model),
  );
  const own = Math.max(Number(product.stock?.currentStock) || 0, 0);
  const quantity = own + models.reduce((sum, m) => sum + m.quantity, 0);
  return {
    id: String(product._id),
    photo_url: product.photoUrl,
    category_id: product.categoryId ? String(product.categoryId) : null,
    models,
    quantity,
    in_stock: quantity > 0,
  };
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
            const models = inStockOnly(modelMap.get(String(p._id))).map((m) => m.model);
            const matchesSearch =
              words.length === 0 ||
              modelScore(words, p.productName, isFuzzy) !== null ||
              models.some((m) => modelScore(words, m, isFuzzy) !== null);
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
        { $project: { photoUrl: 1, categoryId: 1, "stock.currentStock": 1 } },
      ]),
      Product.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: products.map((p) => toCover(p, modelMap.get(String(p._id)))),
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
      .select("photoUrl categoryId stock.currentStock")
      .lean();
    if (!product) {
      return res.status(404).json({ success: false, message: "Cover not found" });
    }
    const modelMap = await modelsByProduct();
    return res.json({ success: true, data: toCover(product, modelMap.get(String(product._id))) });
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
        count: stats.get(String(c._id)).count,
        photo_url: c.thumbnailUrl || stats.get(String(c._id)).photo_url,
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
    const store = await StoreInfo.findOne().select("storeName address phone").lean();
    return res.json({
      success: true,
      data: {
        name: store?.storeName || "",
        address: store?.address || "",
        phone: store?.phone || "",
      },
    });
  } catch (error) {
    console.error("Catalog store error:", error);
    return res.status(500).json({ success: false, message: "Failed to load store" });
  }
};
