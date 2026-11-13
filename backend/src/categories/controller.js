import mongoose from "mongoose";
import Category from "../models/Category.js";
import Product from "../models/Product.js";
import { logActivity } from "../utils/activityLog.js";
import { uploadImageBuffer, deleteImage } from "../utils/cloudinaryUpload.js";

import { escapeRegex } from "../utils/escapeRegex.js";
const toApiCategory = (doc) => ({
  id: doc._id.toString(),
  category_name: doc.categoryName,
  category_name_zh: doc.categoryNameZh || null,
  description: doc.description,
  thumbnail_url: doc.thumbnailUrl || null,
  sizes: doc.sizes || [],
  created_at: doc.createdAt,
  updated_at: doc.updatedAt,
});

// Trimmed, non-empty, no case-insensitive duplicates, order kept
const cleanSizes = (sizes) => {
  if (!Array.isArray(sizes)) return [];
  const seen = new Set();
  const out = [];
  for (const raw of sizes) {
    const size = String(raw ?? "").trim().slice(0, 40);
    if (!size || seen.has(size.toLowerCase())) continue;
    seen.add(size.toLowerCase());
    out.push(size);
  }
  return out.slice(0, 50);
};

export const createCategory = async (req, res) => {
  try {
    const { category_name, category_name_zh, description, sizes } = req.body;

    if (!category_name) {
      return res.status(400).json({
        success: false,
        message: "Category name is required",
      });
    }

    const existing = await Category.findOne({ categoryName: category_name.trim() });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Category with this name already exists",
      });
    }

    const category = await Category.create({
      categoryName: category_name.trim(),
      categoryNameZh: String(category_name_zh || "").trim(),
      description: description ? description.trim() : "",
      sizes: cleanSizes(sizes),
    });

    return res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: toApiCategory(category),
    });
  } catch (error) {
    console.error("Error creating category:", error.message);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const getCategories = async (req, res) => {
  try {
    const { page, limit, search } = req.query;

    const pageNum = Math.max(parseInt(page) || 1, 1);
    const limitNum = Math.max(parseInt(limit) || 10, 1);
    const offset = (pageNum - 1) * limitNum;

    const filter = {};

    if (search) {
      const regex = new RegExp(escapeRegex(search), "i");
      filter.$or = [{ categoryName: regex }, { description: regex }];
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [categories, totalCount, categoriesWithDesc, recentCategories] =
      await Promise.all([
        Category.find(filter).sort({ createdAt: -1 }).skip(offset).limit(limitNum),
        Category.countDocuments(filter),
        Category.countDocuments({
          ...filter,
          description: { $exists: true, $nin: [null, ""] },
        }),
        Category.countDocuments({ ...filter, createdAt: { $gte: sevenDaysAgo } }),
      ]);

    return res.status(200).json({
      success: true,
      totalCount,
      data: categories.map(toApiCategory),
      stats: {
        totalCategories: totalCount,
        categoriesWithDesc,
        recentCategories,
      },
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(totalCount / limitNum),
    });
  } catch (error) {
    console.error("Error fetching categories:", error.message);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    return res.status(200).json({ success: true, data: toApiCategory(category) });
  } catch (error) {
    console.error("Error fetching category:", error.message);

    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { category_name, category_name_zh, description, sizes } = req.body;

    if (!category_name) {
      return res.status(400).json({
        success: false,
        message: "Category name is required",
      });
    }

    const existingCategory = await Category.findById(id);

    if (!existingCategory) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    const duplicate = await Category.findOne({
      categoryName: category_name.trim(),
      _id: { $ne: id },
    });

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: "Category with this name already exists",
      });
    }

    existingCategory.categoryName = category_name.trim();
    if (category_name_zh !== undefined) {
      existingCategory.categoryNameZh = String(category_name_zh || "").trim();
    }
    existingCategory.description = description !== undefined ? description.trim() : existingCategory.description;
    if (sizes !== undefined) existingCategory.sizes = cleanSizes(sizes);
    await existingCategory.save();

    return res.status(200).json({
      success: true,
      message: "Category updated successfully",
      data: toApiCategory(existingCategory),
    });
  } catch (error) {
    console.error("Error updating category:", error.message);

    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findByIdAndDelete(id);

    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    deleteImage(category.thumbnailPublicId).catch((err) =>
      console.error("Failed to delete category thumbnail:", err.message),
    );

    return res.status(200).json({ success: true, message: "Category deleted successfully" });
  } catch (error) {
    console.error("Error deleting category:", error.message);

    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const uploadCategoryThumbnail = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid category ID" });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: "Thumbnail file is required" });
    }

    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    const oldPublicId = category.thumbnailPublicId;

    const result = await uploadImageBuffer(req.file.buffer, {
      folder: "byapardesk/categories",
    });

    category.thumbnailUrl = result.secure_url;
    category.thumbnailPublicId = result.public_id;
    await category.save();

    deleteImage(oldPublicId).catch((err) =>
      console.error("Failed to delete old category thumbnail:", err.message),
    );

    return res.status(200).json({
      success: true,
      message: "Thumbnail uploaded successfully",
      data: toApiCategory(category),
    });
  } catch (error) {
    console.error("Upload category thumbnail error:", error.message);

    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const removeCategoryThumbnail = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    const oldPublicId = category.thumbnailPublicId;
    category.thumbnailUrl = "";
    category.thumbnailPublicId = "";
    await category.save();

    deleteImage(oldPublicId).catch((err) =>
      console.error("Failed to delete category thumbnail:", err.message),
    );

    return res.status(200).json({ success: true, data: toApiCategory(category) });
  } catch (error) {
    console.error("Remove category thumbnail error:", error.message);

    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// The order categories appear in on the customer shop (and the price page):
// every category, in that order, with its details and how many products it has.
export const getCategoryOrder = async (req, res) => {
  try {
    const [categories, counts] = await Promise.all([
      Category.find({}).sort({ sortOrder: 1, categoryName: 1 }).lean(),
      Product.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: "$categoryId", count: { $sum: 1 } } },
      ]),
    ]);
    const countOf = new Map(counts.map((c) => [String(c._id), c.count]));
    return res.json({
      success: true,
      data: categories.map((c) => ({
        ...toApiCategory(c),
        products: countOf.get(String(c._id)) || 0,
      })),
    });
  } catch (error) {
    console.error("Error loading category order:", error);
    return res.status(500).json({ success: false, message: "Failed to load the order" });
  }
};

// Save a new order: { ids: [first, second, ...] }. Categories left out keep
// their place after the listed ones.
export const saveCategoryOrder = async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(String) : null;
    if (!ids || ids.length === 0 || ids.length > 500 || !ids.every((id) => mongoose.isValidObjectId(id))) {
      return res.status(400).json({ success: false, message: "Send the categories in their new order" });
    }
    if (new Set(ids).size !== ids.length) {
      return res.status(400).json({ success: false, message: "A category is listed twice" });
    }
    const listed = await Category.countDocuments({ _id: { $in: ids } });
    if (listed !== ids.length) {
      return res.status(400).json({ success: false, message: "Some categories no longer exist. Refresh and try again." });
    }

    // gaps of 10, so one category can later be slotted in between two others
    await Category.bulkWrite(
      ids.map((id, i) => ({
        updateOne: { filter: { _id: id }, update: { $set: { sortOrder: (i + 1) * 10 } } },
      })),
    );
    // anything not listed goes after, in its current order
    const rest = await Category.find({ _id: { $nin: ids } }).sort({ sortOrder: 1, categoryName: 1 }).select("_id").lean();
    if (rest.length) {
      await Category.bulkWrite(
        rest.map((c, i) => ({
          updateOne: { filter: { _id: c._id }, update: { $set: { sortOrder: (ids.length + i + 1) * 10 } } },
        })),
      );
    }

    await logActivity({
      action: "CATEGORY_ORDER_CHANGED",
      entityType: "Category",
      summary: "Changed the order of categories on the shop",
    });
    return res.json({ success: true, message: "Order saved" });
  } catch (error) {
    console.error("Error saving category order:", error);
    return res.status(500).json({ success: false, message: "Failed to save the order" });
  }
};
