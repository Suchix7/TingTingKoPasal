import Sale from "../models/Sale.js";
import Expense from "../models/Expense.js";
import PaymentMethod from "../models/PaymentMethod.js";
import PaymentMethodTransaction from "../models/PaymentMethodTransaction.js";
import ProductBatch from "../models/ProductBatch.js";

const isValidDate = (date) => {
  if (!date) return false;
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(date)) return false;
  const parsedDate = new Date(date);
  return !isNaN(parsedDate.getTime());
};

const toNum = (v) => Number(v || 0);

export const getDaybookByDate = async (req, res) => {
  try {
    const { date } = req.query;

    if (!isValidDate(date)) {
      return res.status(400).json({
        success: false,
        message: "Valid date is required. Use YYYY-MM-DD format",
      });
    }

    const dayStart = new Date(`${date}T00:00:00.000Z`);
    const dayEnd = new Date(dayStart);
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

    const salesDocs = await Sale.find({ createdAt: { $gte: dayStart, $lt: dayEnd } })
      .sort({ _id: -1 })
      .populate("customerId", "name phone")
      .lean();

    const sales = salesDocs.map((s) => ({
      id: s._id,
      invoice_no: s.invoiceNo,
      customer_id: s.customerId?._id || null,
      customer_name: s.customerId?.name || s.customerName,
      customer_phone: s.customerId?.phone || s.customerPhone,
      subtotal: s.subtotal,
      discount_amount: s.discountAmount,
      tax_amount: s.taxAmount,
      grand_total: s.grandTotal,
      paid_amount: s.paidAmount,
      change_amount: s.changeAmount,
      remaining_amount: s.remainingAmount,
      payment_status: s.paymentStatus,
      sale_status: s.saleStatus,
      notes: s.notes,
      created_at: s.createdAt,
    }));

    const batchIds = salesDocs.flatMap((s) => s.items.map((i) => i.batchId).filter(Boolean));
    const batches = await ProductBatch.find({ _id: { $in: batchIds } }).lean();
    const batchMap = new Map(batches.map((b) => [String(b._id), b]));

    const saleItems = salesDocs.flatMap((s) =>
      s.items.map((item) => {
        const batch = item.batchId ? batchMap.get(String(item.batchId)) : null;
        const costPrice = toNum(item.costPrice);
        const profitAmount =
          toNum(item.totalPrice) - toNum(item.discountAmount) - costPrice * toNum(item.quantity);

        return {
          id: `${s._id}-${item.productId}`,
          sale_id: s._id,
          product_id: item.productId,
          batch_id: item.batchId || null,
          product_name: item.productName,
          sku: item.sku,
          batch_number: batch?.batchNumber || null,
          batch_cost_price: batch?.costPrice || null,
          batch_sale_price: batch?.salePrice || null,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          discount_amount: item.discountAmount,
          tax_amount: item.taxAmount,
          tax_inclusive: item.taxInclusive,
          total_price: item.totalPrice,
          cost_price: costPrice,
          profit_amount: profitAmount,
          sale_status: s.saleStatus,
        };
      }),
    );

    const paymentMethodDocs = await PaymentMethod.find({}).lean();
    const paymentMethodMap = new Map(paymentMethodDocs.map((pm) => [String(pm._id), pm]));

    const salePayments = salesDocs.flatMap((s) =>
      s.payments.map((p, idx) => {
        const pm = paymentMethodMap.get(String(p.paymentMethodId));
        return {
          id: `${s._id}-${idx}`,
          sale_id: s._id,
          invoice_no: s.invoiceNo,
          payment_method_id: p.paymentMethodId,
          payment_method: pm?.paymentMethod || "Unknown",
          payment_method_type: pm?.type || "Unknown",
          amount: p.amount,
          created_at: p.createdAt,
        };
      }),
    );

    const salesPaymentSummaryMap = new Map();
    salesDocs
      .filter((s) => s.saleStatus === "Completed")
      .forEach((s) => {
        s.payments.forEach((p) => {
          const key = String(p.paymentMethodId);
          const pm = paymentMethodMap.get(key);
          const existing = salesPaymentSummaryMap.get(key) || {
            payment_method_id: p.paymentMethodId,
            payment_method: pm?.paymentMethod || "Unknown",
            payment_method_type: pm?.type || "Unknown",
            total_amount: 0,
            transaction_count: 0,
          };
          existing.total_amount += toNum(p.amount);
          existing.transaction_count += 1;
          salesPaymentSummaryMap.set(key, existing);
        });
      });
    const salesPaymentSummary = Array.from(salesPaymentSummaryMap.values()).sort(
      (a, b) => b.total_amount - a.total_amount,
    );

    const expenseDocs = await Expense.find({ expenseDate: { $gte: dayStart, $lt: dayEnd } })
      .sort({ _id: -1 })
      .populate("paymentMethodId", "paymentMethod type")
      .lean();

    const expenses = expenseDocs.map((e) => ({
      id: e._id,
      expense_date: e.expenseDate,
      category: e.category,
      title: e.title,
      amount: e.amount,
      payment_method_id: e.paymentMethodId?._id || null,
      payment_method: e.paymentMethodId?.paymentMethod || null,
      payment_method_type: e.paymentMethodId?.type || null,
      notes: e.notes,
      created_at: e.createdAt,
      updated_at: e.updatedAt,
    }));

    const expenseCategorySummaryMap = new Map();
    const expensePaymentSummaryMap = new Map();
    expenseDocs.forEach((e) => {
      const cat = expenseCategorySummaryMap.get(e.category) || {
        category: e.category,
        total_amount: 0,
        expense_count: 0,
      };
      cat.total_amount += toNum(e.amount);
      cat.expense_count += 1;
      expenseCategorySummaryMap.set(e.category, cat);

      const pmKey = String(e.paymentMethodId?._id || "unknown");
      const pmEntry = expensePaymentSummaryMap.get(pmKey) || {
        payment_method_id: e.paymentMethodId?._id || null,
        payment_method: e.paymentMethodId?.paymentMethod || "Unknown",
        payment_method_type: e.paymentMethodId?.type || "Unknown",
        total_amount: 0,
        expense_count: 0,
      };
      pmEntry.total_amount += toNum(e.amount);
      pmEntry.expense_count += 1;
      expensePaymentSummaryMap.set(pmKey, pmEntry);
    });

    const expenseCategorySummary = Array.from(expenseCategorySummaryMap.values()).sort(
      (a, b) => b.total_amount - a.total_amount,
    );
    const expensePaymentSummary = Array.from(expensePaymentSummaryMap.values()).sort(
      (a, b) => b.total_amount - a.total_amount,
    );

    const completedSales = salesDocs.filter((s) => s.saleStatus === "Completed");

    const salesSummary = {
      total_sales_count: salesDocs.length,
      completed_sales_count: completedSales.length,
      cancelled_sales_count: salesDocs.filter((s) => s.saleStatus === "Cancelled").length,
      returned_sales_count: salesDocs.filter((s) => s.saleStatus === "Returned").length,
      paid_sales_count: salesDocs.filter((s) => s.paymentStatus === "Paid").length,
      partial_sales_count: salesDocs.filter((s) => s.paymentStatus === "Partial").length,
      unpaid_sales_count: salesDocs.filter((s) => s.paymentStatus === "Unpaid").length,
      refunded_sales_count: salesDocs.filter((s) => s.paymentStatus === "Refunded").length,
      cancel_sales_count: salesDocs.filter((s) => s.paymentStatus === "Cancelled").length,

      total_sales_amount: completedSales.reduce((sum, s) => sum + toNum(s.grandTotal), 0),
      total_subtotal: completedSales.reduce((sum, s) => sum + toNum(s.subtotal), 0),
      total_discount: completedSales.reduce((sum, s) => sum + toNum(s.discountAmount), 0),
      total_tax: completedSales.reduce((sum, s) => sum + toNum(s.taxAmount), 0),
      total_paid_amount: completedSales.reduce((sum, s) => sum + toNum(s.paidAmount), 0),
      total_change_amount: completedSales.reduce((sum, s) => sum + toNum(s.changeAmount), 0),
      total_remaining_amount: completedSales.reduce((sum, s) => sum + toNum(s.remainingAmount), 0),
    };

    const totalReceived = completedSales.reduce(
      (sum, s) => sum + s.payments.reduce((pSum, p) => pSum + toNum(p.amount), 0),
      0,
    );

    const totalExpenses = expenseDocs.reduce((sum, e) => sum + toNum(e.amount), 0);

    let grossProfit = 0;
    let totalCostOfGoods = 0;
    completedSales.forEach((s) => {
      s.items.forEach((item) => {
        const cost = toNum(item.costPrice) * toNum(item.quantity);
        totalCostOfGoods += cost;
        grossProfit +=
          toNum(item.totalPrice) - toNum(item.discountAmount) - cost - toNum(item.taxAmount);
      });
    });

    const netProfit = grossProfit - totalExpenses;

    const allPaymentMethods = await PaymentMethod.find({ isDeleted: false }).lean();

    const openingAgg = await PaymentMethodTransaction.aggregate([
      { $match: { transactionDate: { $lt: dayStart } } },
      {
        $group: {
          _id: "$paymentMethodId",
          balance: {
            $sum: { $cond: [{ $eq: ["$direction", "IN"] }, "$amount", { $multiply: ["$amount", -1] }] },
          },
        },
      },
    ]);
    const openingMap = new Map(openingAgg.map((o) => [String(o._id), o.balance]));

    const todayAgg = await PaymentMethodTransaction.aggregate([
      { $match: { transactionDate: { $gte: dayStart, $lt: dayEnd } } },
      {
        $group: {
          _id: "$paymentMethodId",
          totalIn: { $sum: { $cond: [{ $eq: ["$direction", "IN"] }, "$amount", 0] } },
          totalOut: { $sum: { $cond: [{ $eq: ["$direction", "OUT"] }, "$amount", 0] } },
        },
      },
    ]);
    const todayMap = new Map(todayAgg.map((t) => [String(t._id), t]));

    const paymentMethodBalances = allPaymentMethods
      .map((pm) => {
        const key = String(pm._id);
        const opening = toNum(openingMap.get(key));
        const today = todayMap.get(key) || { totalIn: 0, totalOut: 0 };
        const totalIn = toNum(today.totalIn);
        const totalOut = toNum(today.totalOut);

        return {
          payment_method_id: pm._id,
          payment_method: pm.paymentMethod,
          payment_method_type: pm.type,
          opening_balance: opening,
          total_in: totalIn,
          total_out: totalOut,
          closing_balance: opening + totalIn - totalOut,
        };
      })
      .sort((a, b) => (a.payment_method || "").localeCompare(b.payment_method || ""));

    const [paymentMethodTransactionSummaryAgg] = await PaymentMethodTransaction.aggregate([
      {
        $match: {
          transactionDate: { $gte: dayStart, $lt: dayEnd },
          transactionType: { $ne: "OPENING_BALANCE" },
        },
      },
      {
        $group: {
          _id: null,
          total_in: { $sum: { $cond: [{ $eq: ["$direction", "IN"] }, "$amount", 0] } },
          total_out: { $sum: { $cond: [{ $eq: ["$direction", "OUT"] }, "$amount", 0] } },
          net_cash_flow: {
            $sum: { $cond: [{ $eq: ["$direction", "IN"] }, "$amount", { $multiply: ["$amount", -1] }] },
          },
        },
      },
    ]);

    const paymentMethodTransactionTypeSummary = await PaymentMethodTransaction.aggregate([
      {
        $match: {
          transactionDate: { $gte: dayStart, $lt: dayEnd },
          transactionType: { $ne: "OPENING_BALANCE" },
        },
      },
      {
        $group: {
          _id: { transactionType: "$transactionType", direction: "$direction" },
          total_amount: { $sum: "$amount" },
          transaction_count: { $sum: 1 },
        },
      },
      { $sort: { "_id.transactionType": 1 } },
      {
        $project: {
          _id: 0,
          transaction_type: "$_id.transactionType",
          direction: "$_id.direction",
          total_amount: 1,
          transaction_count: 1,
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      date,

      summary: {
        ...salesSummary,
        total_received: totalReceived,

        total_expense_count: expenseDocs.length,
        total_expense_amount: totalExpenses,

        total_cost_of_goods: totalCostOfGoods,
        gross_profit: grossProfit,
        net_profit: netProfit,

        total_payment_method_in: toNum(paymentMethodTransactionSummaryAgg?.total_in),
        total_payment_method_out: toNum(paymentMethodTransactionSummaryAgg?.total_out),
        net_cash_flow: toNum(paymentMethodTransactionSummaryAgg?.net_cash_flow),
      },

      sales,
      saleItems,
      salePayments,

      expenses,
      paymentMethodBalances,

      summaries: {
        salesPaymentSummary,
        expensePaymentSummary,
        expenseCategorySummary,
        paymentMethodTransactionTypeSummary,
      },
    });
  } catch (error) {
    console.error("Get daybook error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch daybook",
    });
  }
};
