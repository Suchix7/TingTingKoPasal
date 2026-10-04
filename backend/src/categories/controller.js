import Category from "../models/Category.js";

const toApiCategory = (doc) => ({
  id: doc._id.toString(),
  category_name: doc.categoryName,
  description: doc.description,
  created_at: doc.createdAt,
  updated_at: doc.updatedAt,
});

export const createCategory = async (req, res) => {
  try {
    const { category_name, description } = req.body;

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
      description: description ? description.trim() : "",
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
      const regex = new RegExp(search, "i");
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
    const { category_name, description } = req.body;

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
    existingCategory.description = description !== undefined ? description.trim() : existingCategory.description;
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

    return res.status(200).json({ success: true, message: "Category deleted successfully" });
  } catch (error) {
    console.error("Error deleting category:", error.message);

    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};
