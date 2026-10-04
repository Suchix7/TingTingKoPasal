import Product from "../models/Product.js";
import InventoryTransaction from "../models/InventoryTransaction.js";
import PurchaseOrder from "../models/PurchaseOrder.js";
import { getBatchStockMap } from "../utils/stock.js";

const DEFAULT_LEAD_TIME_DAYS = 7;
const DEFAULT_SAFETY_STOCK_DAYS = 3;

const calculateEoqValues = ({
  product,
  yearlyDemand,
  orderingCost,
  holdingCost,
  savedReorderLevel,
  leadTimeDays = DEFAULT_LEAD_TIME_DAYS,
  safetyStockDays = DEFAULT_SAFETY_STOCK_DAYS,
}) => {
  let eoq = null;
  let numberOfOrdersPerYear = 0;
  let totalInventoryCost = 0;
  let recommendedOrderQuantity = null;
  let status = "Ready";

  const averageDailyDemand = yearlyDemand > 0 ? yearlyDemand / 365 : 0;
  const safetyStock = Math.ceil(averageDailyDemand * safetyStockDays);
  const calculatedReorderPoint = Math.ceil(averageDailyDemand * leadTimeDays + safetyStock);

  if (yearlyDemand <= 0) {
    status = "Missing demand data";
  } else if (orderingCost <= 0) {
    status = "Missing ordering cost";
  } else if (holdingCost <= 0) {
    status = "Missing holding cost";
  } else {
    const rawEoq = Math.sqrt((2 * yearlyDemand * orderingCost) / holdingCost);
    eoq = Math.ceil(rawEoq);
    numberOfOrdersPerYear = eoq > 0 ? yearlyDemand / eoq : 0;
    totalInventoryCost = (yearlyDemand / eoq) * orderingCost + (eoq / 2) * holdingCost;
    recommendedOrderQuantity = eoq;
  }

  return {
    product_id: product._id,
    product_name: product.productName,
    sku: product.sku,

    yearly_demand: yearlyDemand,
    average_daily_demand: Number(averageDailyDemand.toFixed(2)),

    ordering_cost: orderingCost,
    holding_cost_per_unit: holdingCost,
    unit_cost: Number(product.costPrice || 0),

    eoq,
    number_of_orders_per_year: Number(numberOfOrdersPerYear.toFixed(2)),

    saved_reorder_level: Number(savedReorderLevel || 0),
    calculated_reorder_point: calculatedReorderPoint,
    reorder_point: calculatedReorderPoint,

    safety_stock: safetyStock,
    safety_stock_days: safetyStockDays,
    lead_time_days: leadTimeDays,

    total_inventory_cost: Number(totalInventoryCost.toFixed(2)),
    recommended_order_quantity: recommendedOrderQuantity,

    status,
  };
};

export const calculateEOQByProductId = async (req, res) => {
  try {
    const { product_id } = req.params;

    const product = await Product.findById(product_id).lean();

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const [demandAgg] = await InventoryTransaction.aggregate([
      {
        $match: {
          productId: product._id,
          type: "OUT",
          referenceType: "SALE",
          createdAt: { $gte: oneYearAgo },
        },
      },
      { $group: { _id: null, yearly_demand: { $sum: "$quantity" } } },
    ]);

    const [orderingCostAgg] = await PurchaseOrder.aggregate([
      { $match: { status: "Received" } },
      { $unwind: "$items" },
      { $match: { "items.productId": product._id } },
      { $group: { _id: null, ordering_cost: { $avg: "$orderingCost" } } },
    ]);

    const yearlyDemand = Number(demandAgg?.yearly_demand || 0);
    const orderingCost = Number(orderingCostAgg?.ordering_cost || 0);
    const holdingCost = Number(product.costs?.holdingCostPerUnit || 0);
    const reorderLevel = Number(product.stock?.reorderLevel || 0);

    const result = calculateEoqValues({
      product,
      yearlyDemand,
      orderingCost,
      holdingCost,
      savedReorderLevel: reorderLevel,
    });

    return res.status(200).json({
      success: true,
      message: result.status !== "Ready" ? result.status : undefined,
      data: result,
    });
  } catch (error) {
    console.error("Calculate EOQ error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const calculateEOQForAllProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sortField = "total_inventory_cost",
      sortOrder = "desc",
      filterMissingCost = "false",
      filterHighDemand = "false",
      filterUrgentReorder = "false",
      search = "",
      leadTimeDays = 7,
      safetyStockDays = 3,
    } = req.query;

    const pageNum = Math.max(Number(page) || 1, 1);
    const limitNum = Math.min(Math.max(Number(limit) || 10, 1), 100);
    const offset = (pageNum - 1) * limitNum;

    const normalizedLeadTimeDays = Math.max(Number(leadTimeDays) || 7, 1);
    const normalizedSafetyStockDays = Math.max(Number(safetyStockDays) || 3, 0);
    const normalizedSortOrder = String(sortOrder).toLowerCase() === "asc" ? 1 : -1;

    const isMissingCostFilter = String(filterMissingCost) === "true";
    const isHighDemandFilter = String(filterHighDemand) === "true";
    const isUrgentReorderFilter = String(filterUrgentReorder) === "true";
    const searchText = String(search || "").trim();

    const productMatch = {};
    if (searchText) {
      const regex = new RegExp(searchText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      productMatch.$or = [{ productName: regex }, { sku: regex }];
    }

    const products = await Product.find(productMatch).lean();

    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const demandAgg = await InventoryTransaction.aggregate([
      { $match: { type: "OUT", referenceType: "SALE", createdAt: { $gte: oneYearAgo } } },
      { $group: { _id: "$productId", yearly_demand: { $sum: "$quantity" } } },
    ]);
    const demandMap = new Map(demandAgg.map((d) => [String(d._id), d.yearly_demand]));

    const orderingCostAgg = await PurchaseOrder.aggregate([
      { $match: { status: "Received" } },
      { $unwind: "$items" },
      { $group: { _id: "$items.productId", ordering_cost: { $avg: "$orderingCost" } } },
    ]);
    const orderingCostMap = new Map(orderingCostAgg.map((o) => [String(o._id), o.ordering_cost]));

    const batchStockMap = await getBatchStockMap(products.map((p) => p._id));

    let rows = products.map((product) => {
      const yearlyDemand = Number(demandMap.get(String(product._id)) || 0);
      const orderingCost = Number(orderingCostMap.get(String(product._id)) || 0);
      const holdingCost = Number(product.costs?.holdingCostPerUnit || 0);
      const unitCost = Number(product.costPrice || 0);
      const currentStock =
        Number(product.stock?.currentStock || 0) +
        (batchStockMap.get(String(product._id)) || 0);
      const savedReorderLevel = Number(product.stock?.reorderLevel || 0);

      const averageDailyDemand = yearlyDemand / 365;
      const safetyStock = averageDailyDemand * normalizedSafetyStockDays;
      const reorderPoint =
        averageDailyDemand * normalizedLeadTimeDays + averageDailyDemand * normalizedSafetyStockDays;

      const eoq =
        yearlyDemand > 0 && orderingCost > 0 && holdingCost > 0
          ? Math.sqrt((2 * yearlyDemand * orderingCost) / holdingCost)
          : 0;

      const numberOfOrdersPerYear = eoq > 0 ? yearlyDemand / eoq : 0;
      const recommendedOrderQuantity = eoq > 0 ? eoq : 0;
      const totalInventoryCost =
        eoq > 0 ? (yearlyDemand / eoq) * orderingCost + (eoq / 2) * holdingCost : 0;

      const status = orderingCost > 0 && holdingCost > 0 && unitCost > 0 ? "Ready" : "Missing Data";
      const missingDataScore = status === "Ready" ? 0 : 1;

      return {
        product_id: product._id,
        product_name: product.productName,
        sku: product.sku,

        yearly_demand: Number(yearlyDemand.toFixed(2)),
        ordering_cost: Number(orderingCost.toFixed(2)),
        holding_cost_per_unit: Number(holdingCost.toFixed(2)),
        unit_cost: Number(unitCost.toFixed(2)),

        eoq: Number(eoq.toFixed(2)),
        number_of_orders_per_year: Number(numberOfOrdersPerYear.toFixed(2)),
        reorder_point: Number(reorderPoint.toFixed(0)),
        safety_stock: Number(safetyStock.toFixed(2)),
        total_inventory_cost: Number(totalInventoryCost.toFixed(2)),
        recommended_order_quantity: Number(recommendedOrderQuantity.toFixed(2)),

        lead_time_days: normalizedLeadTimeDays,
        average_daily_demand: Number(averageDailyDemand.toFixed(2)),
        saved_reorder_level: savedReorderLevel,
        calculated_reorder_point: Number(reorderPoint.toFixed(2)),
        safety_stock_days: normalizedSafetyStockDays,

        current_stock: currentStock,
        status,
        missing_data_score: missingDataScore,
      };
    });

    if (isMissingCostFilter) {
      rows = rows.filter(
        (r) => r.ordering_cost === 0 || r.holding_cost_per_unit === 0 || r.unit_cost === 0,
      );
    }
    if (isHighDemandFilter) {
      rows = rows.filter((r) => r.yearly_demand > 5000);
    }
    if (isUrgentReorderFilter) {
      rows = rows.filter((r) => r.reorder_point > 0 && r.current_stock <= r.reorder_point);
    }

    const totalCount = rows.length;

    const missingCostData = rows.filter(
      (r) => r.ordering_cost === 0 || r.holding_cost_per_unit === 0 || r.unit_cost === 0,
    ).length;
    const highDemandProducts = rows.filter((r) => r.yearly_demand > 5000).length;
    const urgentReorder = rows.filter(
      (r) => r.reorder_point > 0 && r.current_stock <= r.reorder_point,
    ).length;
    const eoqValues = rows.map((r) => r.eoq).filter((v) => v > 0);
    const averageEoq = eoqValues.length
      ? eoqValues.reduce((sum, v) => sum + v, 0) / eoqValues.length
      : 0;

    const sortFieldMap = {
      total_inventory_cost: "total_inventory_cost",
      yearly_demand: "yearly_demand",
      eoq: "eoq",
      product_name: "product_name",
      missing_data: "missing_data_score",
      reorder_point: "reorder_point",
      current_stock: "current_stock",
    };
    const selectedSortField = sortFieldMap[sortField] || "total_inventory_cost";

    rows.sort((a, b) => {
      if (selectedSortField === "product_name") {
        return a.product_name.localeCompare(b.product_name) * normalizedSortOrder * -1;
      }
      return (Number(a[selectedSortField]) - Number(b[selectedSortField])) * normalizedSortOrder * -1;
    });

    const paginated = rows.slice(offset, offset + limitNum);

    const dataWithAlerts = paginated.map((item) => {
      const alerts = [];

      if (item.reorder_point > 0 && item.current_stock <= item.reorder_point) {
        alerts.push({ type: "URGENT_REORDER", message: "Current stock is at or below calculated reorder point" });
      }
      if (item.holding_cost_per_unit === 0 || item.unit_cost === 0) {
        alerts.push({ type: "MISSING_COST_DATA", message: "Product has missing cost data" });
      }
      if (item.ordering_cost === 0) {
        alerts.push({ type: "MISSING_ORDERING_DATA", message: "No received purchase order data found for this product" });
      }
      if (item.yearly_demand > 5000) {
        alerts.push({ type: "HIGH_DEMAND", message: "Product has high yearly demand" });
      }

      return { ...item, alerts };
    });

    return res.status(200).json({
      success: true,
      data: dataWithAlerts,
      stats: {
        totalProducts: totalCount,
        missingCostData,
        highDemandProducts,
        urgentReorder,
        averageEoq: Number(averageEoq.toFixed(2)),
      },
      totalCount,
      totalPages: Math.ceil(totalCount / limitNum),
      page: pageNum,
      limit: limitNum,
    });
  } catch (error) {
    console.error("Calculate all EOQ error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
