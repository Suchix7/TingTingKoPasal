import mongoose from "mongoose";
import Product from "../models/Product.js";
import ProductBatch from "../models/ProductBatch.js";
import Category from "../models/Category.js";

// Public, read-only catalog for the customer site. It only ever exposes the
// cover photo, its category and the phone models in stock: no prices, names,
// SKUs, barcodes or stock counts.

const baseFilter = () => ({
  isDeleted: false,
  status: "Active",
  photoUrl: { $nin: [null, ""] },
});

// productId -> phone models that are in stock for it
async function inStockModelsByProduct() {
  const batches = await ProductBatch.find({
    isDeleted: false,
    quantity: { $gt: 0 },
  })
    .select("productId batchNumber")
    .lean();

  const map = new Map();
  for (const b of batches) {
    const key = String(b.productId);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(b.batchNumber);
  }
  return map;
}

const toCover = (product, models) => ({
  id: String(product._id),
  photo_url: product.photoUrl,
  category_id: product.categoryId ? String(product.categoryId) : null,
  models: [...(models || [])].sort((a, b) => a.localeCompare(b)),
});

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

    const modelMap = await inStockModelsByProduct();

    const filter = baseFilter();
    if (category && category !== "All") {
      if (!mongoose.isValidObjectId(category)) {
        return res.json({ success: true, data: [], pagination: { total: 0, hasMore: false } });
      }
      filter.categoryId = category;
    }

    const words = q.split(/\s+/).filter(Boolean);
    const filteringByModel = words.length > 0 || wanted.length > 0;

    if (filteringByModel) {
      const ids = [];
      for (const [productId, models] of modelMap) {
        const lower = models.map((m) => m.toLowerCase());
        // every typed word must appear in the same model name ("14 pro")
        const matchesSearch =
          words.length === 0 ||
          lower.some((m) => words.every((w) => m.includes(w)));
        const matchesPick =
          wanted.length === 0 || lower.some((m) => wanted.includes(m));
        if (matchesSearch && matchesPick) ids.push(productId);
      }
      filter._id = { $in: ids };
    } else {
      filter.$or = [
        { _id: { $in: [...modelMap.keys()] } },
        { "stock.currentStock": { $gt: 0 } },
      ];
    }

    const [products, total] = await Promise.all([
      Product.find(filter)
        .select("photoUrl categoryId")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Product.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: products.map((p) => toCover(p, modelMap.get(String(p._id)))),
      pagination: { total, hasMore: page * limit < total },
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
      .select("photoUrl categoryId")
      .lean();
    if (!product) {
      return res.status(404).json({ success: false, message: "Cover not found" });
    }
    const modelMap = await inStockModelsByProduct();
    return res.json({ success: true, data: toCover(product, modelMap.get(String(product._id))) });
  } catch (error) {
    console.error("Catalog cover error:", error);
    return res.status(500).json({ success: false, message: "Failed to load cover" });
  }
};

// Phone models that have at least one cover in stock, with how many covers.
export const getModels = async (_req, res) => {
  try {
    const modelMap = await inStockModelsByProduct();
    const visible = new Set(
      (
        await Product.find({
          ...baseFilter(),
          _id: { $in: [...modelMap.keys()] },
        })
          .select("_id")
          .lean()
      ).map((p) => String(p._id)),
    );

    const counts = new Map();
    for (const [productId, models] of modelMap) {
      if (!visible.has(productId)) continue;
      for (const m of new Set(models)) counts.set(m, (counts.get(m) || 0) + 1);
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

export const getCategories = async (_req, res) => {
  try {
    const ids = await Product.distinct("categoryId", baseFilter());
    const categories = await Category.find({ _id: { $in: ids } })
      .sort({ categoryName: 1 })
      .lean();
    return res.json({
      success: true,
      data: categories.map((c) => ({ id: String(c._id), name: c.categoryName })),
    });
  } catch (error) {
    console.error("Catalog categories error:", error);
    return res.status(500).json({ success: false, message: "Failed to load categories" });
  }
};
