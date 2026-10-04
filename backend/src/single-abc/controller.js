import Product from "../models/Product.js";
import Sale from "../models/Sale.js";
import InventoryTransaction from "../models/InventoryTransaction.js";
import { getBatchStockMap } from "../utils/stock.js";

const calculateABCData = async ({ periodDays = 365 }) => {
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
    salesData.map((s) => [String(s._id), { ...s, sales_frequency: s.sales.length }]),
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

  const batchStockMap = await getBatchStockMap(products.map((p) => p._id));

  const calculatedProducts = products.map((product) => {
    const key = String(product._id);
    const sd = salesMap.get(key);
    const im = movementMap.get(key);

    // own stock + stock held on batches / phone models
    const currentStock =
      Number(product.stock?.currentStock || 0) + (batchStockMap.get(key) || 0);
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

  const totalRevenue = calculatedProducts.reduce((total, p) => total + p.revenue, 0);
  calculatedProducts.sort((a, b) => b.revenue - a.revenue);

  let cumulativeRevenue = 0;

  return calculatedProducts.map((product, index) => {
    const previousPercentage = totalRevenue > 0 ? (cumulativeRevenue / totalRevenue) * 100 : 100;
    cumulativeRevenue += product.revenue;
    const cumulativePercentage = totalRevenue > 0 ? (cumulativeRevenue / totalRevenue) * 100 : 100;
    const revenuePercentage = totalRevenue > 0 ? (product.revenue / totalRevenue) * 100 : 0;

    let classification = "C";
    if (previousPercentage < 70) classification = "A";
    else if (previousPercentage < 90) classification = "B";

    return {
      ...product,
      rank: index + 1,
      revenue_percentage: Number(revenuePercentage.toFixed(2)),
      cumulative_percentage: Number(cumulativePercentage.toFixed(2)),
      classification,
    };
  });
};

export const calculateTraditionalABCClassification = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      classification = "",
      sortField = "revenue",
      sortOrder = "desc",
      periodDays = 365,
    } = req.query;

    const pageNum = Math.max(Number(page) || 1, 1);
    const limitNum = Math.min(Math.max(Number(limit) || 10, 1), 100);
    const normalizedPeriodDays = Math.min(Math.max(Number(periodDays) || 365, 1), 3650);

    let data = await calculateABCData({ periodDays: normalizedPeriodDays });

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
      "rank", "revenue", "revenue_percentage", "cumulative_percentage", "profit",
      "sales_frequency", "inventory_turnover", "units_sold", "current_stock", "product_name",
    ];
    const selectedSortField = allowedSortFields.includes(sortField) ? sortField : "revenue";
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
          recommendation = "High-value product. Maintain strong availability and monitor stock closely.";
          break;
        case "B":
          recommendation = "Medium-value product. Maintain regular inventory monitoring.";
          break;
        default:
          recommendation = "Low-value product. Avoid unnecessary overstocking and review demand periodically.";
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
        criterion: "Revenue",
        classificationMethod: "Traditional Single-Criteria ABC",
        thresholds: {
          A: "First 70% of cumulative revenue",
          B: "70% - 90% of cumulative revenue",
          C: "Remaining 90% - 100% of cumulative revenue",
        },
      },
      totalCount,
      totalPages,
      page: pageNum,
      limit: limitNum,
    });
  } catch (error) {
    console.error("Traditional ABC Classification error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
