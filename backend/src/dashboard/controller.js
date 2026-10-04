import mongoose from "mongoose";
import Sale from "../models/Sale.js";
import Customer from "../models/Customer.js";
import Product from "../models/Product.js";
import ProductBatch from "../models/ProductBatch.js";
import PaymentMethod from "../models/PaymentMethod.js";
import Expense from "../models/Expense.js";

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

const subtractDays = (date, days) => {
  const d = startOfDay(date);
  d.setDate(d.getDate() - days);
  return d;
};

const toNumber = (value) => Number(value || 0);

const dateKeyOf = (date) => {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const formatDateLabel = (dateKey) => {
  const date = new Date(dateKey);
  return date.toLocaleDateString("en-NP", { month: "short", day: "numeric" });
};

const getLastDays = (days = 7) => {
  const result = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const d = startOfDay(now);
    d.setDate(d.getDate() - i);
    const key = dateKeyOf(d);

    result.push({ dateKey: key, name: formatDateLabel(key), sales: 0, profit: 0, count: 0 });
  }

  return result;
};

export const getDashboardOverview = async (req, res) => {
  try {
    const chartDays = Math.max(Number(req.query.chartDays) || 7, 1);
    const topLimit = Math.max(Number(req.query.topLimit) || 5, 1);

    const now = new Date();

    const todayStart = startOfDay(now);
    const todayEnd = endExclusiveOfDay(now);

    const monthStart = startOfMonth(now);
    const monthEnd = startOfNextMonth(now);

    const chartStart = subtractDays(now, chartDays - 1);
    const chartEnd = endExclusiveOfDay(now);

    const [todaySummaryAgg] = await Sale.aggregate([
      {
        $match: {
          saleStatus: "Completed",
          createdAt: { $gte: todayStart, $lt: todayEnd },
        },
      },
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
      {
        $match: {
          saleStatus: "Completed",
          createdAt: { $gte: monthStart, $lt: monthEnd },
        },
      },
      {
        $group: {
          _id: null,
          monthlyOrders: { $sum: 1 },
          monthlySales: { $sum: "$grandTotal" },
          monthlyProfit: { $sum: "$profitAmount" },
        },
      },
    ]);

    const [creditSummaryAgg] = await Customer.aggregate([
      { $match: { creditAmount: { $gt: 0 } } },
      {
        $group: {
          _id: null,
          totalCredit: { $sum: "$creditAmount" },
          customersWithCredit: { $sum: 1 },
        },
      },
    ]);

    const [inventorySummaryAgg] = await Product.aggregate([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: null,
          lowStockCount: {
            $sum: {
              $cond: [
                { $lte: ["$stock.currentStock", "$stock.reorderLevel"] },
                1,
                0,
              ],
            },
          },
          outOfStockCount: {
            $sum: { $cond: [{ $eq: ["$stock.currentStock", 0] }, 1, 0] },
          },
        },
      },
    ]);

    const rawDailyRevenue = await Sale.aggregate([
      {
        $match: {
          saleStatus: "Completed",
          createdAt: { $gte: chartStart, $lt: chartEnd },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          sales: { $sum: "$grandTotal" },
          profit: { $sum: "$profitAmount" },
          count: { $sum: 1 },
        },
      },
    ]);

    const dailyMap = new Map();
    getLastDays(chartDays).forEach((item) => dailyMap.set(item.dateKey, item));

    rawDailyRevenue.forEach((item) => {
      dailyMap.set(item._id, {
        dateKey: item._id,
        name: formatDateLabel(item._id),
        sales: toNumber(item.sales),
        profit: toNumber(item.profit),
        count: toNumber(item.count),
      });
    });

    const dailyRevenue = Array.from(dailyMap.values());

    const topCustomers = await Sale.aggregate([
      {
        $match: {
          saleStatus: "Completed",
          customerId: { $ne: null },
          createdAt: { $gte: monthStart, $lt: monthEnd },
        },
      },
      {
        $group: {
          _id: "$customerId",
          orders: { $sum: 1 },
          totalSpent: { $sum: "$grandTotal" },
          totalProfit: { $sum: "$profitAmount" },
        },
      },
      { $sort: { totalSpent: -1 } },
      { $limit: topLimit },
      {
        $lookup: {
          from: "customers",
          localField: "_id",
          foreignField: "_id",
          as: "customer",
        },
      },
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

    const topProducts = await Sale.aggregate([
      {
        $match: {
          saleStatus: "Completed",
          createdAt: { $gte: monthStart, $lt: monthEnd },
        },
      },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productId",
          name: { $first: "$items.productName" },
          sku: { $first: "$items.sku" },
          quantity: { $sum: "$items.quantity" },
          revenue: { $sum: "$items.totalPrice" },
        },
      },
      { $sort: { quantity: -1, revenue: -1 } },
      { $limit: topLimit },
      {
        $project: {
          _id: 0,
          id: "$_id",
          name: 1,
          sku: 1,
          quantity: 1,
          revenue: 1,
        },
      },
    ]);

    const recentSalesDocs = await Sale.find({ saleStatus: "Completed" })
      .sort({ createdAt: -1 })
      .limit(8)
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
      payment_status: sale.paymentStatus,
      sale_status: sale.saleStatus,
      created_at: sale.createdAt,
    }));

    const lowStockItemsDocs = await Product.find({
      isDeleted: false,
      $expr: { $lte: ["$stock.currentStock", "$stock.reorderLevel"] },
    })
      .sort({ "stock.currentStock": 1 })
      .limit(8)
      .lean();

    const lowStockItems = lowStockItemsDocs.map((p) => ({
      id: p._id,
      product_id: p._id,
      product_name: p.productName,
      sku: p.sku,
      current_stock: p.stock.currentStock,
      reorder_level: p.stock.reorderLevel,
      reorder_quantity: p.stock.reorderQuantity,
    }));

    const lowStockBatchesDocs = await ProductBatch.aggregate([
      { $match: { isDeleted: false } },
      {
        $lookup: {
          from: "products",
          localField: "productId",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
      { $match: { "product.isDeleted": false } },
      {
        $match: {
          $expr: { $lte: ["$quantity", "$product.stock.reorderLevel"] },
        },
      },
      { $sort: { quantity: 1, updatedAt: 1 } },
      { $limit: 8 },
    ]);

    const lowStockBatches = lowStockBatchesDocs.map((b) => ({
      id: b._id,
      product_id: b.productId,
      product_name: b.product.productName,
      sku: b.product.sku,
      batch_number: b.batchNumber,
      quantity: b.quantity,
      cost_price: b.costPrice,
      sale_price: b.salePrice,
      reorder_level: b.product.stock?.reorderLevel || 0,
      reorder_quantity: b.product.stock?.reorderQuantity || 0,
      created_at: b.createdAt,
      updated_at: b.updatedAt,
    }));

    const paymentTotalsToday = await Sale.aggregate([
      {
        $match: {
          saleStatus: "Completed",
          createdAt: { $gte: todayStart, $lt: todayEnd },
        },
      },
      { $unwind: "$payments" },
      {
        $group: {
          _id: "$payments.paymentMethodId",
          amount: { $sum: "$payments.amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    const paymentTotalsMap = new Map(
      paymentTotalsToday.map((p) => [String(p._id), p]),
    );

    const paymentMethodsDocs = await PaymentMethod.find({ isDeleted: false }).lean();

    const paymentMethodsToday = paymentMethodsDocs
      .map((pm) => {
        const totals = paymentTotalsMap.get(String(pm._id));
        return {
          id: pm._id,
          name: pm.paymentMethod,
          type: pm.type,
          amount: toNumber(totals?.amount),
          count: toNumber(totals?.count),
        };
      })
      .sort((a, b) => b.amount - a.amount);

    const expensesTodayDocs = await Expense.find({
      expenseDate: { $gte: todayStart, $lt: todayEnd },
    })
      .populate("paymentMethodId", "paymentMethod")
      .lean();

    const expensesToday = expensesTodayDocs.map((e) => ({
      id: e._id,
      category: e.category,
      title: e.title,
      amount: e.amount,
      payment_method: e.paymentMethodId?.paymentMethod || null,
    }));

    const todaySales = toNumber(todaySummaryAgg?.todaySales);
    const todayProfit = toNumber(todaySummaryAgg?.todayProfit);
    const monthlySales = toNumber(monthlySummaryAgg?.monthlySales);
    const monthlyProfit = toNumber(monthlySummaryAgg?.monthlyProfit);

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          todaySales,
          todayProfit,
          todayOrders: toNumber(todaySummaryAgg?.todayOrders),
          todayProfitMargin:
            todaySales > 0 ? Number(((todayProfit / todaySales) * 100).toFixed(1)) : 0,

          monthlySales,
          monthlyProfit,
          monthlyOrders: toNumber(monthlySummaryAgg?.monthlyOrders),
          monthlyProfitMargin:
            monthlySales > 0
              ? Number(((monthlyProfit / monthlySales) * 100).toFixed(1))
              : 0,

          totalCredit: toNumber(creditSummaryAgg?.totalCredit),
          customersWithCredit: toNumber(creditSummaryAgg?.customersWithCredit),

          lowStockCount: toNumber(inventorySummaryAgg?.lowStockCount),
          outOfStockCount: toNumber(inventorySummaryAgg?.outOfStockCount),
        },

        dailyRevenue,
        topCustomers,
        topProducts,
        recentSales,
        lowStockItems,
        lowStockBatches,
        paymentMethodsToday,
        expensesToday,
      },
    });
  } catch (error) {
    console.error("Dashboard overview error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch dashboard overview",
    });
  }
};
