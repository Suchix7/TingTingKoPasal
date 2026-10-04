import mongoose from "mongoose";
import Product from "../models/Product.js";

function costRating(total) {
  if (total >= 1000) return "HIGH";
  if (total >= 500) return "MEDIUM";
  return "LOW";
}

function serializeCost(product) {
  const c = product.costs || {};
  const total =
    Number(c.holdingCostPerUnit || 0) +
    Number(c.storageCost || 0) +
    Number(c.insuranceCost || 0);

  return {
    id: String(product._id),
    product_id: String(product._id),
    holding_cost_per_unit: c.holdingCostPerUnit || 0,
    storage_cost: c.storageCost || 0,
    insurance_cost: c.insuranceCost || 0,
    spoilage_rate: c.spoilageRate || 0,
    total_cost: total,
    cost_rating: costRating(total),
    created_at: product.createdAt,
    updated_at: product.updatedAt,
    product_name: product.productName,
    sku: product.sku,
    unit: product.unit,
    cost_price: product.costPrice,
  };
}

export const createInventoryCost = async (req, res) => {
  try {
    const {
      product_id,
      holding_cost_per_unit = 0,
      storage_cost = 0,
      insurance_cost = 0,
      spoilage_rate = 0,
    } = req.body;

    if (!product_id) {
      return res.status(400).json({ success: false, message: "Product ID is required." });
    }

    const product = await Product.findById(product_id);

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found." });
    }

    const values = [holding_cost_per_unit, storage_cost, insurance_cost, spoilage_rate].map(Number);

    if (values.some((v) => Number.isNaN(v) || v < 0)) {
      return res.status(400).json({
        success: false,
        message: "Inventory cost values must be valid non-negative numbers.",
      });
    }

    product.costs = {
      holdingCostPerUnit: values[0],
      storageCost: values[1],
      insuranceCost: values[2],
      spoilageRate: values[3],
    };
    await product.save();

    return res.status(201).json({
      success: true,
      message: "Inventory cost created successfully",
      data: serializeCost(product),
    });
  } catch (error) {
    console.log("Error while creating inventory cost: ", error.message);

    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getAllInventoryCosts = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.max(Number(req.query.limit) || 10, 1);
    const search = req.query.search?.trim() || "";
    const costFilter = req.query.costFilter?.trim()?.toUpperCase() || "ALL";
    const sortBy = req.query.sortBy?.trim() || "updated_desc";
    const offset = (page - 1) * limit;

    const filter = { isDeleted: false };
    if (search) {
      filter.$or = [
        { productName: { $regex: search, $options: "i" } },
        { sku: { $regex: search, $options: "i" } },
      ];
    }

    const allProducts = await Product.find(filter);

    let rows = allProducts.map((p) => serializeCost(p));

    if (costFilter !== "ALL") {
      rows = rows.filter((r) => r.cost_rating === costFilter);
    }

    const sortFns = {
      total_asc: (a, b) => a.total_cost - b.total_cost,
      total_desc: (a, b) => b.total_cost - a.total_cost,
      name_asc: (a, b) => (a.product_name || "").localeCompare(b.product_name || ""),
      name_desc: (a, b) => (b.product_name || "").localeCompare(a.product_name || ""),
      spoilage_desc: (a, b) => b.spoilage_rate - a.spoilage_rate,
      updated_desc: (a, b) => new Date(b.updated_at) - new Date(a.updated_at),
    };
    rows.sort(sortFns[sortBy] || sortFns.updated_desc);

    const totalCount = rows.length;
    const paged = rows.slice(offset, offset + limit);

    const stats = rows.reduce(
      (acc, r) => {
        acc.total += 1;
        acc.totalHolding += r.holding_cost_per_unit;
        acc.totalStorage += r.storage_cost;
        acc.totalInsurance += r.insurance_cost;
        acc.totalCosts += r.total_cost;
        acc.spoilageSum += r.spoilage_rate;
        if (r.cost_rating === "HIGH") acc.highCost += 1;
        if (r.cost_rating === "MEDIUM") acc.mediumCost += 1;
        if (r.cost_rating === "LOW") acc.lowCost += 1;
        return acc;
      },
      {
        total: 0,
        totalHolding: 0,
        totalStorage: 0,
        totalInsurance: 0,
        totalCosts: 0,
        spoilageSum: 0,
        highCost: 0,
        mediumCost: 0,
        lowCost: 0,
      },
    );

    return res.status(200).json({
      success: true,
      data: paged,
      totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
      stats: {
        total: stats.total,
        totalHolding: stats.totalHolding,
        totalStorage: stats.totalStorage,
        totalInsurance: stats.totalInsurance,
        totalCosts: stats.totalCosts,
        avgSpoilage: stats.total ? stats.spoilageSum / stats.total : 0,
        highCost: stats.highCost,
        mediumCost: stats.mediumCost,
        lowCost: stats.lowCost,
      },
    });
  } catch (error) {
    console.error("Get inventory costs error:", error.message);

    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getInventoryCostByProductId = async (req, res) => {
  try {
    const { product_id } = req.params;

    if (!mongoose.isValidObjectId(product_id)) {
      return res.status(404).json({ success: false, message: "Inventory cost not found" });
    }

    const product = await Product.findById(product_id);

    if (!product) {
      return res.status(404).json({ success: false, message: "Inventory cost not found" });
    }

    return res.json({ success: true, data: serializeCost(product) });
  } catch (error) {
    console.error("Get inventory cost error:", error.message);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const updateInventoryCost = async (req, res) => {
  try {
    const { product_id } = req.params;

    const product = await Product.findById(product_id);

    if (!product) {
      return res.status(404).json({ success: false, message: "Inventory cost not found" });
    }

    const { holding_cost_per_unit, storage_cost, insurance_cost, spoilage_rate } = req.body;

    const updated = {
      holdingCostPerUnit:
        holding_cost_per_unit !== undefined
          ? Number(holding_cost_per_unit)
          : Number(product.costs.holdingCostPerUnit),
      storageCost:
        storage_cost !== undefined ? Number(storage_cost) : Number(product.costs.storageCost),
      insuranceCost:
        insurance_cost !== undefined
          ? Number(insurance_cost)
          : Number(product.costs.insuranceCost),
      spoilageRate:
        spoilage_rate !== undefined ? Number(spoilage_rate) : Number(product.costs.spoilageRate),
    };

    if (Object.values(updated).some((v) => Number.isNaN(v) || v < 0)) {
      return res.status(400).json({
        success: false,
        message: "Inventory cost values must be valid non-negative numbers",
      });
    }

    product.costs = updated;
    await product.save();

    return res.json({ success: true, message: "Inventory cost updated successfully" });
  } catch (error) {
    console.error("Update inventory cost error:", error.message);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const deleteInventoryCost = async (req, res) => {
  try {
    const { product_id } = req.params;

    const product = await Product.findById(product_id);

    if (!product) {
      return res.status(404).json({ success: false, message: "Inventory cost not found" });
    }

    product.costs = {
      holdingCostPerUnit: 0,
      storageCost: 0,
      insuranceCost: 0,
      spoilageRate: 0,
    };
    await product.save();

    return res.json({ success: true, message: "Inventory cost deleted successfully" });
  } catch (error) {
    console.error("Delete inventory cost error:", error.message);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};
