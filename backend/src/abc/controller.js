import Product from "../models/Product.js";
import Sale from "../models/Sale.js";
import InventoryTransaction from "../models/InventoryTransaction.js";

const DEFAULT_WEIGHTS = { revenue: 0.3, profit: 0.3, frequency: 0.2, turnover: 0.2 };

const normalize = (value, min, max) => {
  if (max === min) return max > 0 ? 100 : 0;
  return ((value - min) / (max - min)) * 100;
};

const calculateABCData = async ({ periodDays = 365, weights = DEFAULT_WEIGHTS }) => {
  const since = new Date();
  since.setDate(since.getDate() - periodDays);

  const salesData = await Sale.aggregate([
    { $match: { saleStatus: "Completed", createdAt: { $gte: since } } },
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.productId",
        units_sold: { $sum: "$items.quantity" },
        revenue: { $sum: "$items.totalPrice" },
        profit: { $sum: "$items.profitAmount" },
        sales: { $addToSet: "$_id" },
      },
    },
  ]);
  const salesMap = new Map(
    salesData.map((s) => [
      String(s._id),
      { ...s, sales_frequency: s.sales.length },
    ]),
  );

  const movementData = await InventoryTransaction.aggregate([
    { $match: { createdAt: { $gte: since } } },
    {
      $group: {
        _id: "$productId",
        stock_in: { $sum: { $cond: [{ $eq: ["$type", "IN"] }, "$quantity", 0] } },
        stock_out: { $sum: { $cond: [{ $eq: ["$type", "OUT"] }, "$quantity", 0] } },
        stock_adjustment: { $sum: { $cond: [{ $eq: ["$type", "ADJUSTMENT"] }, "$quantity", 0] } },
      },
    },
  ]);
  const movementMap = new Map(movementData.map((m) => [String(m._id), m]));

  const products = await Product.find({ isDeleted: false, status: "Active" }).lean();

  if (!products.length) return [];

  const calculatedProducts = products.map((product) => {
    const key = String(product._id);
    const sd = salesMap.get(key);
    const im = movementMap.get(key);

    const currentStock = Number(product.stock?.currentStock || 0);
    const stockIn = Number(im?.stock_in || 0);
    const stockOut = Number(im?.stock_out || 0);
    const stockAdjustment = Number(im?.stock_adjustment || 0);
    const unitsSold = Number(sd?.units_sold || 0);

    const calculatedBeginningStock = currentStock - stockIn + stockOut - stockAdjustment;
    const beginningStock = Math.max(calculatedBeginningStock, 0);
    const averageInventory = (beginningStock + currentStock) / 2;
    const inventoryTurnover = averageInventory > 0 ? unitsSold / averageInventory : 0;

    return {
      product_id: product._id,
      product_name: product.productName,
      sku: product.sku,
      category_id: product.categoryId,
      cost_price: Number(product.costPrice || 0),
      sale_price: Number(product.salePrice || 0),
      current_stock: currentStock,
      reorder_level: Number(product.stock?.reorderLevel || 0),

      units_sold: unitsSold,
      revenue: Number(sd?.revenue || 0),
      profit: Number(sd?.profit || 0),
      sales_frequency: Number(sd?.sales_frequency || 0),

      stock_in: stockIn,
      stock_out: stockOut,
      stock_adjustment: stockAdjustment,

      calculated_beginning_stock: calculatedBeginningStock,
      beginning_stock: beginningStock,
      average_inventory: Number(averageInventory.toFixed(2)),
      inventory_turnover: Number(inventoryTurnover.toFixed(4)),
    };
  });

  const revenues = calculatedProducts.map((p) => p.revenue);
  const profits = calculatedProducts.map((p) => p.profit);
  const frequencies = calculatedProducts.map((p) => p.sales_frequency);
  const turnovers = calculatedProducts.map((p) => p.inventory_turnover);

  const ranges = {
    revenue: { min: Math.min(...revenues), max: Math.max(...revenues) },
    profit: { min: Math.min(...profits), max: Math.max(...profits) },
    frequency: { min: Math.min(...frequencies), max: Math.max(...frequencies) },
    turnover: { min: Math.min(...turnovers), max: Math.max(...turnovers) },
  };

  const normalizedProducts = calculatedProducts.map((product) => {
    const revenueScore = normalize(product.revenue, ranges.revenue.min, ranges.revenue.max);
    const profitScore = normalize(product.profit, ranges.profit.min, ranges.profit.max);
    const frequencyScore = normalize(product.sales_frequency, ranges.frequency.min, ranges.frequency.max);
    const turnoverScore = normalize(product.inventory_turnover, ranges.turnover.min, ranges.turnover.max);

    const finalScore =
      revenueScore * weights.revenue +
      profitScore * weights.profit +
      frequencyScore * weights.frequency +
      turnoverScore * weights.turnover;

    return {
      ...product,
      scores: {
        revenue: Number(revenueScore.toFixed(2)),
        profit: Number(profitScore.toFixed(2)),
        frequency: Number(frequencyScore.toFixed(2)),
        turnover: Number(turnoverScore.toFixed(2)),
      },
      final_score: Number(finalScore.toFixed(2)),
    };
  });

  normalizedProducts.sort((a, b) => b.final_score - a.final_score);

  const totalScore = normalizedProducts.reduce((total, p) => total + p.final_score, 0);
  let cumulativeScore = 0;

  return normalizedProducts.map((product, index) => {
    const previousPercentage = totalScore > 0 ? (cumulativeScore / totalScore) * 100 : 100;
    cumulativeScore += product.final_score;
    const cumulativePercentage = totalScore > 0 ? (cumulativeScore / totalScore) * 100 : 100;

    let classification = "C";
    if (previousPercentage < 70) classification = "A";
    else if (previousPercentage < 90) classification = "B";

    return {
      ...product,
      rank: index + 1,
      cumulative_percentage: Number(cumulativePercentage.toFixed(2)),
      classification,
    };
  });
};

export const calculateABCClassification = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      classification = "",
      sortField = "final_score",
      sortOrder = "desc",
      periodDays = 365,
      revenueWeight = 30,
      profitWeight = 30,
      frequencyWeight = 20,
      turnoverWeight = 20,
    } = req.query;

    const pageNum = Math.max(Number(page) || 1, 1);
    const limitNum = Math.min(Math.max(Number(limit) || 10, 1), 100);
    const normalizedPeriodDays = Math.min(Math.max(Number(periodDays) || 365, 1), 3650);

    const rawWeights = {
      revenue: Math.max(Number(revenueWeight) || 0, 0),
      profit: Math.max(Number(profitWeight) || 0, 0),
      frequency: Math.max(Number(frequencyWeight) || 0, 0),
      turnover: Math.max(Number(turnoverWeight) || 0, 0),
    };

    const totalWeight =
      rawWeights.revenue + rawWeights.profit + rawWeights.frequency + rawWeights.turnover;

    if (totalWeight <= 0) {
      return res.status(400).json({
        success: false,
        message: "At least one ABC criterion must have a weight greater than 0",
      });
    }

    const weights = {
      revenue: rawWeights.revenue / totalWeight,
      profit: rawWeights.profit / totalWeight,
      frequency: rawWeights.frequency / totalWeight,
      turnover: rawWeights.turnover / totalWeight,
    };

    let data = await calculateABCData({ periodDays: normalizedPeriodDays, weights });

    const allProducts = data;
    const totalProducts = allProducts.length;
    const classAProducts = allProducts.filter((p) => p.classification === "A").length;
    const classBProducts = allProducts.filter((p) => p.classification === "B").length;
    const classCProducts = allProducts.filter((p) => p.classification === "C").length;
    const totalRevenue = allProducts.reduce((sum, p) => sum + p.revenue, 0);
    const totalProfit = allProducts.reduce((sum, p) => sum + p.profit, 0);
    const totalUnitsSold = allProducts.reduce((sum, p) => sum + p.units_sold, 0);
    const averageTurnover =
      totalProducts > 0
        ? allProducts.reduce((sum, p) => sum + p.inventory_turnover, 0) / totalProducts
        : 0;

    const searchText = String(search).trim().toLowerCase();
    if (searchText) {
      data = data.filter(
        (p) =>
          p.product_name?.toLowerCase().includes(searchText) ||
          p.sku?.toLowerCase().includes(searchText),
      );
    }

    const normalizedClassification = String(classification).trim().toUpperCase();
    if (["A", "B", "C"].includes(normalizedClassification)) {
      data = data.filter((p) => p.classification === normalizedClassification);
    }

    const allowedSortFields = [
      "rank", "final_score", "revenue", "profit", "sales_frequency",
      "inventory_turnover", "units_sold", "current_stock", "product_name",
    ];
    const selectedSortField = allowedSortFields.includes(sortField) ? sortField : "final_score";
    const direction = String(sortOrder).toLowerCase() === "asc" ? 1 : -1;

    data.sort((a, b) => {
      if (selectedSortField === "product_name") {
        return a.product_name.localeCompare(b.product_name) * direction;
      }
      return (Number(a[selectedSortField]) - Number(b[selectedSortField])) * direction;
    });

    const totalCount = data.length;
    const totalPages = Math.ceil(totalCount / limitNum);
    const offset = (pageNum - 1) * limitNum;
    const paginatedData = data.slice(offset, offset + limitNum);

    const finalData = paginatedData.map((product) => {
      const alerts = [];
      let recommendation = "";

      if (product.calculated_beginning_stock < 0) {
        alerts.push({
          type: "INCOMPLETE_INVENTORY_HISTORY",
          message: "Historical inventory transactions may be incomplete for the selected period",
        });
      }
      if (product.units_sold === 0) {
        alerts.push({
          type: "NO_SALES",
          message: "No completed sales found during the selected analysis period",
        });
      }
      if (product.current_stock <= product.reorder_level && product.classification === "A") {
        alerts.push({
          type: "HIGH_PRIORITY_LOW_STOCK",
          message: "Class A product is at or below its reorder level",
        });
      }

      switch (product.classification) {
        case "A":
          recommendation = "High-priority product. Maintain strong availability and monitor stock closely.";
          break;
        case "B":
          recommendation = "Medium-priority product. Maintain regular inventory monitoring.";
          break;
        default:
          recommendation = "Low-priority product. Avoid unnecessary overstocking and review demand periodically.";
      }

      return { ...product, recommendation, alerts };
    });

    return res.status(200).json({
      success: true,
      data: finalData,
      stats: {
        totalProducts,
        classAProducts,
        classBProducts,
        classCProducts,
        totalRevenue: Number(totalRevenue.toFixed(2)),
        totalProfit: Number(totalProfit.toFixed(2)),
        totalUnitsSold,
        averageInventoryTurnover: Number(averageTurnover.toFixed(2)),
      },
      configuration: {
        periodDays: normalizedPeriodDays,
        weights: {
          revenue: Number((weights.revenue * 100).toFixed(2)),
          profit: Number((weights.profit * 100).toFixed(2)),
          frequency: Number((weights.frequency * 100).toFixed(2)),
          turnover: Number((weights.turnover * 100).toFixed(2)),
        },
        thresholds: {
          A: "First 70% of cumulative weighted score",
          B: "70% - 90% of cumulative weighted score",
          C: "Remaining 90% - 100%",
        },
      },
      totalCount,
      totalPages,
      page: pageNum,
      limit: limitNum,
    });
  } catch (error) {
    console.error("ABC Classification error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
