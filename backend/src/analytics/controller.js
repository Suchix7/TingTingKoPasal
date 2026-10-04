import Sale from "../models/Sale.js";
import Customer from "../models/Customer.js";
import Product from "../models/Product.js";
import PaymentMethod from "../models/PaymentMethod.js";
import PaymentMethodTransaction from "../models/PaymentMethodTransaction.js";
import Expense from "../models/Expense.js";
import Category from "../models/Category.js";
import { totalStockStages } from "../utils/stock.js";

const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const endExclusiveOfDay = (date) => {
  const d = startOfDay(date);
  d.setDate(d.getDate() + 1);
  return d;
};

const startOfMonth = (date) => {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
};

const startOfNextMonth = (date) => {
  const d = startOfMonth(date);
  d.setMonth(d.getMonth() + 1);
  return d;
};

const startOfYear = (date) => {
  const d = new Date(date);
  d.setMonth(0, 1);
  d.setHours(0, 0, 0, 0);
  return d;
};

const startOfNextYear = (date) => {
  const d = startOfYear(date);
  d.setFullYear(d.getFullYear() + 1);
  return d;
};

const getDateRange = ({ preset = "this_month", startDate, endDate }) => {
  const now = new Date();

  if (preset === "all") return { preset, start: null, end: null };

  if (preset === "custom") {
    if (!startDate || !endDate) {
      throw new Error("startDate and endDate are required for custom preset");
    }

    const start = startOfDay(new Date(startDate));
    const end = endExclusiveOfDay(new Date(endDate));

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new Error("Invalid startDate or endDate");
    }

    if (start >= end) {
      throw new Error("startDate must be before endDate");
    }

    return { preset, start, end };
  }

  if (preset === "today") {
    return { preset, start: startOfDay(now), end: endExclusiveOfDay(now) };
  }

  if (preset === "yesterday") {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    return { preset, start: startOfDay(yesterday), end: endExclusiveOfDay(yesterday) };
  }

  if (preset === "last_7_days") {
    const start = startOfDay(now);
    start.setDate(start.getDate() - 6);
    return { preset, start, end: endExclusiveOfDay(now) };
  }

  if (preset === "last_30_days") {
    const start = startOfDay(now);
    start.setDate(start.getDate() - 29);
    return { preset, start, end: endExclusiveOfDay(now) };
  }

  if (preset === "last_month") {
    const start = startOfMonth(now);
    start.setMonth(start.getMonth() - 1);
    const end = startOfMonth(now);
    return { preset, start, end };
  }

  if (preset === "this_year") {
    return { preset, start: startOfYear(now), end: startOfNextYear(now) };
  }

  return { preset: "this_month", start: startOfMonth(now), end: startOfNextMonth(now) };
};

const toNumber = (value) => Number(value || 0);

const formatMonthName = (monthKey) => {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-NP", {
    month: "short",
    year: "numeric",
  });
};

const getLastMonths = (count = 6) => {
  const months = [];
  const now = new Date();

  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    months.push({ monthKey: key, name: formatMonthName(key), sales: 0, profit: 0, count: 0 });
  }

  return months;
};

const matchStage = (range, extra = {}) => {
  const match = { saleStatus: "Completed", ...extra };
  if (range.start && range.end) {
    match.createdAt = { $gte: range.start, $lt: range.end };
  }
  return match;
};

export const getAnalyticsOverview = async (req, res) => {
  try {
    const {
      preset = "this_month",
      startDate,
      endDate,
      topLimit = 5,
      recentLimit = 8,
      chartMonths = 6,
    } = req.query;

    const range = getDateRange({ preset, startDate, endDate });
    const todayRange = getDateRange({ preset: "today" });
    const monthRange = getDateRange({ preset: "this_month" });

    const expenseMatch = {};
    if (range.start) expenseMatch.expenseDate = { ...(expenseMatch.expenseDate || {}), $gte: range.start };
    if (range.end) expenseMatch.expenseDate = { ...(expenseMatch.expenseDate || {}), $lt: range.end };

    const [rangeSalesSummaryAgg] = await Sale.aggregate([
      { $match: matchStage(range) },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalSales: { $sum: "$grandTotal" },
          totalProfit: { $sum: "$profitAmount" },
          totalPaid: { $sum: "$paidAmount" },
          totalRemaining: { $sum: "$remainingAmount" },
        },
      },
    ]);

    const [todaySummaryAgg] = await Sale.aggregate([
      { $match: matchStage(todayRange) },
      {
        $group: {
          _id: null,
          todayOrders: { $sum: 1 },
          todaySales: { $sum: "$grandTotal" },
          todayProfit: { $sum: "$profitAmount" },
        },
      },
    ]);

    const [monthlySummaryAgg] = await Sale.aggregate([
      { $match: matchStage(monthRange) },
      {
        $group: {
          _id: null,
          monthlyOrders: { $sum: 1 },
          monthlySales: { $sum: "$grandTotal" },
          monthlyProfit: { $sum: "$profitAmount" },
        },
      },
    ]);

    const [expenseSummaryAgg] = await Expense.aggregate([
      { $match: expenseMatch },
      { $group: { _id: null, totalExpenses: { $sum: "$amount" }, totalExpenseRecords: { $sum: 1 } } },
    ]);

    const [totalProducts, totalCustomers, totalCategories, creditAgg] = await Promise.all([
      Product.countDocuments({}),
      Customer.countDocuments({}),
      Category.countDocuments({}),
      Customer.aggregate([{ $group: { _id: null, totalCredit: { $sum: "$creditAmount" } } }]),
    ]);

    const [inventorySummaryAgg] = await Product.aggregate([
      ...totalStockStages,
      {
        $group: {
          _id: null,
          // own stock at the product cost + batch / phone-model stock at batch cost
          stockValue: {
            $sum: {
              $add: [
                { $multiply: ["$costPrice", { $ifNull: ["$stock.currentStock", 0] }] },
                "$batchValue",
              ],
            },
          },
          lowStockCount: {
            $sum: { $cond: [{ $lte: ["$totalStock", "$stock.reorderLevel"] }, 1, 0] },
          },
          outOfStockCount: { $sum: { $cond: [{ $lte: ["$totalStock", 0] }, 1, 0] } },
        },
      },
    ]);

    const salesByDay = (
      await Sale.aggregate([
        { $match: matchStage(range) },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            sales: { $sum: "$grandTotal" },
            profit: { $sum: "$profitAmount" },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ])
    ).map((row) => ({ name: row._id, sales: toNumber(row.sales), profit: toNumber(row.profit), count: row.count }));

    const monthsCount = Math.max(Number(chartMonths) || 6, 1);
    const chartStart = startOfMonth(new Date());
    chartStart.setMonth(chartStart.getMonth() - (monthsCount - 1));
    const chartEnd = startOfNextMonth(new Date());

    const rawSalesByMonth = await Sale.aggregate([
      { $match: { saleStatus: "Completed", createdAt: { $gte: chartStart, $lt: chartEnd } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
          sales: { $sum: "$grandTotal" },
          profit: { $sum: "$profitAmount" },
          count: { $sum: 1 },
        },
      },
    ]);

    const monthMap = new Map();
    getLastMonths(monthsCount).forEach((item) => monthMap.set(item.monthKey, item));
    rawSalesByMonth.forEach((item) => {
      monthMap.set(item._id, {
        monthKey: item._id,
        name: formatMonthName(item._id),
        sales: toNumber(item.sales),
        profit: toNumber(item.profit),
        count: toNumber(item.count),
      });
    });
    const salesByMonth = Array.from(monthMap.values());

    const paymentTxMatch = {};
    if (range.start) paymentTxMatch.transactionDate = { ...(paymentTxMatch.transactionDate || {}), $gte: range.start };
    if (range.end) paymentTxMatch.transactionDate = { ...(paymentTxMatch.transactionDate || {}), $lt: range.end };

    const paymentTotals = await PaymentMethodTransaction.aggregate([
      { $match: paymentTxMatch },
      {
        $group: {
          _id: "$paymentMethodId",
          totalIn: { $sum: { $cond: [{ $eq: ["$direction", "IN"] }, "$amount", 0] } },
          totalOut: { $sum: { $cond: [{ $eq: ["$direction", "OUT"] }, "$amount", 0] } },
          transactionCount: { $sum: 1 },
        },
      },
    ]);

    const paymentTotalsMap = new Map(paymentTotals.map((p) => [String(p._id), p]));

    const paymentMethodDocs = await PaymentMethod.find({ isDeleted: false }).lean();

    const paymentMethods = paymentMethodDocs
      .map((pm) => {
        const t = paymentTotalsMap.get(String(pm._id));
        const totalIn = toNumber(t?.totalIn);
        const totalOut = toNumber(t?.totalOut);
        const currentBalance = totalIn - totalOut;

        return {
          id: pm._id,
          name: pm.paymentMethod,
          type: pm.type,
          totalIn,
          totalOut,
          totalAmount: currentBalance,
          currentBalance,
          count: toNumber(t?.transactionCount),
        };
      })
      .sort((a, b) => b.currentBalance - a.currentBalance);

    const topProducts = await Sale.aggregate([
      { $match: matchStage(range) },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productId",
          name: { $first: "$items.productName" },
          sku: { $first: "$items.sku" },
          quantity: { $sum: "$items.quantity" },
          revenue: { $sum: "$items.totalPrice" },
          profit: { $sum: "$items.profitAmount" },
          orders: { $addToSet: "$_id" },
        },
      },
      {
        $lookup: { from: "products", localField: "_id", foreignField: "_id", as: "product" },
      },
      { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          id: "$_id",
          name: { $ifNull: ["$product.productName", "$name"] },
          sku: { $ifNull: ["$product.sku", "$sku"] },
          cost_price: { $ifNull: ["$product.costPrice", 0] },
          sale_price: { $ifNull: ["$product.salePrice", 0] },
          quantity: 1,
          revenue: 1,
          profit: 1,
          orders: { $size: "$orders" },
        },
      },
      { $sort: { quantity: -1, revenue: -1, profit: -1 } },
      { $limit: Number(topLimit) },
    ]);

    const soldTotalsByProduct = await Sale.aggregate([
      { $match: matchStage(range) },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productId",
          quantity: { $sum: "$items.quantity" },
          revenue: { $sum: "$items.totalPrice" },
          profit: { $sum: "$items.profitAmount" },
          orders: { $addToSet: "$_id" },
        },
      },
    ]);

    const soldMap = new Map(soldTotalsByProduct.map((s) => [String(s._id), s]));

    const allProductsForLow = await Product.find({}).sort({}).lean();

    const lowPerformingProducts = allProductsForLow
      .map((p) => {
        const s = soldMap.get(String(p._id));
        return {
          id: p._id,
          name: p.productName,
          sku: p.sku,
          cost_price: p.costPrice,
          sale_price: p.salePrice,
          quantity: toNumber(s?.quantity),
          revenue: toNumber(s?.revenue),
          profit: toNumber(s?.profit),
          orders: s ? s.orders.length : 0,
        };
      })
      .sort((a, b) => a.quantity - b.quantity || a.revenue - b.revenue || a.profit - b.profit)
      .slice(0, Number(topLimit));

    const topCustomers = await Sale.aggregate([
      { $match: matchStage(range, { customerId: { $ne: null } }) },
      {
        $group: {
          _id: "$customerId",
          orders: { $sum: 1 },
          totalSpent: { $sum: "$grandTotal" },
          totalProfit: { $sum: "$profitAmount" },
        },
      },
      { $sort: { totalSpent: -1 } },
      { $limit: Number(topLimit) },
      { $lookup: { from: "customers", localField: "_id", foreignField: "_id", as: "customer" } },
      { $unwind: "$customer" },
      {
        $project: {
          _id: 0,
          id: "$customer._id",
          name: "$customer.name",
          phone: "$customer.phone",
          credit: { $ifNull: ["$customer.creditAmount", 0] },
          orders: 1,
          totalSpent: 1,
          totalProfit: 1,
        },
      },
    ]);

    const lowStockItemsDocs = await Product.aggregate([
      ...totalStockStages,
      { $match: { $expr: { $lte: ["$totalStock", "$stock.reorderLevel"] } } },
      { $sort: { totalStock: 1 } },
      { $limit: 10 },
    ]);

    const lowStockItems = lowStockItemsDocs.map((p) => ({
      id: p._id,
      product_id: p._id,
      product_name: p.productName,
      sku: p.sku,
      cost_price: p.costPrice,
      sale_price: p.salePrice,
      current_stock: p.totalStock,
      reorder_level: p.stock.reorderLevel,
      reorder_quantity: p.stock.reorderQuantity,
      shortage: p.stock.reorderLevel - p.totalStock,
    }));

    const recentSalesDocs = await Sale.find(matchStage(range))
      .sort({ createdAt: -1 })
      .limit(Number(recentLimit))
      .populate("customerId", "name phone")
      .lean();

    const recentSales = recentSalesDocs.map((sale) => ({
      id: sale._id,
      invoice_no: sale.invoiceNo,
      customer_id: sale.customerId?._id || null,
      customer_name: sale.customerId?.name || sale.customerName || "Walk-in Customer",
      customer_phone: sale.customerId?.phone || sale.customerPhone || "",
      grand_total: sale.grandTotal,
      profit_amount: sale.profitAmount,
      paid_amount: sale.paidAmount,
      remaining_amount: sale.remainingAmount,
      change_amount: sale.changeAmount,
      payment_status: sale.paymentStatus,
      sale_status: sale.saleStatus,
      created_at: sale.createdAt,
    }));

    const rangeSales = toNumber(rangeSalesSummaryAgg?.totalSales);
    const rangeProfit = toNumber(rangeSalesSummaryAgg?.totalProfit);
    const todaySales = toNumber(todaySummaryAgg?.todaySales);
    const todayProfit = toNumber(todaySummaryAgg?.todayProfit);
    const monthlySales = toNumber(monthlySummaryAgg?.monthlySales);
    const monthlyProfit = toNumber(monthlySummaryAgg?.monthlyProfit);
    const totalExpenses = toNumber(expenseSummaryAgg?.totalExpenses);
    const netProfitAfterExpenses = rangeProfit - totalExpenses;

    return res.status(200).json({
      success: true,
      filter: {
        preset: range.preset,
        startDate: range.start ? range.start.toISOString() : null,
        endDate: range.end ? range.end.toISOString() : null,
      },
      data: {
        summary: {
          rangeSales,
          rangeProfit,
          rangeOrders: toNumber(rangeSalesSummaryAgg?.totalOrders),
          rangePaid: toNumber(rangeSalesSummaryAgg?.totalPaid),
          rangeRemaining: toNumber(rangeSalesSummaryAgg?.totalRemaining),
          rangeProfitMargin: rangeSales > 0 ? Number(((rangeProfit / rangeSales) * 100).toFixed(2)) : 0,

          todaySales,
          todayProfit,
          todayOrders: toNumber(todaySummaryAgg?.todayOrders),
          todayProfitMargin: todaySales > 0 ? Number(((todayProfit / todaySales) * 100).toFixed(2)) : 0,

          monthlySales,
          monthlyProfit,
          monthlyOrders: toNumber(monthlySummaryAgg?.monthlyOrders),
          monthlyProfitMargin:
            monthlySales > 0 ? Number(((monthlyProfit / monthlySales) * 100).toFixed(2)) : 0,

          totalProducts,
          totalCustomers,
          totalCategories,
          totalCredit: toNumber(creditAgg[0]?.totalCredit),

          stockValue: toNumber(inventorySummaryAgg?.stockValue),
          lowStockCount: toNumber(inventorySummaryAgg?.lowStockCount),
          outOfStockCount: toNumber(inventorySummaryAgg?.outOfStockCount),
          totalExpenses,
          totalExpenseRecords: toNumber(expenseSummaryAgg?.totalExpenseRecords),
          netProfitAfterExpenses,
        },

        salesByDay,
        salesByMonth,
        paymentMethods,
        topProducts,
        lowPerformingProducts,
        topCustomers,
        lowStockItems,
        recentSales,
      },
    });
  } catch (error) {
    console.error("Analytics overview error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch analytics overview",
    });
  }
};
