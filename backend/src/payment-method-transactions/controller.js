import mongoose from "mongoose";
import PaymentMethodTransaction from "../models/PaymentMethodTransaction.js";

export const getPaymentTransactions = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      payment_method_id = "",
      transaction_type = "",
      direction = "",
      reference_type = "",
      dateFrom = "",
      dateTo = "",
      sortBy = "date_desc",
    } = req.query;

    const pageNum = Math.max(Number(page) || 1, 1);
    const limitNum = Math.max(Number(limit) || 10, 1);
    const offset = (pageNum - 1) * limitNum;

    const normalizedSearch = search.trim();

    const allowedTransactionTypes = [
      "OPENING_BALANCE",
      "CAPITAL_ADDITION",
      "SALE_PAYMENT",
      "SALE_PAYMENT_ADJUSTMENT_OUT",
      "SALE_RETURN",
      "SALE_CANCELLED",
      "SALE_DELETE_REVERSAL",
      "EXPENSE_PAYMENT",
      "EXPENSE_PAYMENT_REVERSAL",
      "EXPENSE_DELETE_REVERSAL",
      "PURCHASE_PAYMENT",
      "WITHDRAWAL",
      "TRANSFER_IN",
      "TRANSFER_OUT",
      "ADJUSTMENT_IN",
      "ADJUSTMENT_OUT",
    ];

    const allowedDirections = ["IN", "OUT"];

    const allowedReferenceTypes = [
      "sale",
      "sale_payment",
      "expense",
      "purchase_order",
      "purchase_order_payment",
      "manual",
      "transfer",
      "adjustment",
    ];

    const allowedSortBy = [
      "date_desc",
      "date_asc",
      "amount_desc",
      "amount_asc",
      "method_asc",
      "method_desc",
      "type_asc",
      "type_desc",
    ];

    if (
      transaction_type &&
      !allowedTransactionTypes.includes(transaction_type)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid transaction type",
      });
    }

    if (direction && !allowedDirections.includes(direction)) {
      return res.status(400).json({
        success: false,
        message: "Invalid transaction direction",
      });
    }

    if (reference_type && !allowedReferenceTypes.includes(reference_type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid reference type",
      });
    }

    const normalizedSortBy = allowedSortBy.includes(sortBy)
      ? sortBy
      : "date_desc";

    const sortMap = {
      date_desc: { transactionDate: -1, _id: -1 },
      date_asc: { transactionDate: 1, _id: 1 },
      amount_desc: { amount: -1, _id: -1 },
      amount_asc: { amount: 1, _id: -1 },
      method_asc: { "method.paymentMethod": 1, _id: -1 },
      method_desc: { "method.paymentMethod": -1, _id: -1 },
      type_asc: { transactionType: 1, _id: -1 },
      type_desc: { transactionType: -1, _id: -1 },
    };

    const match = {};

    if (payment_method_id) {
      match.paymentMethodId = new mongoose.Types.ObjectId(payment_method_id);
    }

    if (transaction_type) {
      match.transactionType = transaction_type;
    }

    if (direction) {
      match.direction = direction;
    }

    if (reference_type) {
      match.referenceType = reference_type;
    }

    if (dateFrom || dateTo) {
      match.transactionDate = {};
      if (dateFrom) match.transactionDate.$gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        match.transactionDate.$lte = end;
      }
    }

    const basePipeline = [
      {
        $lookup: {
          from: "paymentmethods",
          localField: "paymentMethodId",
          foreignField: "_id",
          as: "method",
        },
      },
      { $unwind: { path: "$method", preserveNullAndEmptyArrays: true } },
      { $match: match },
    ];

    if (normalizedSearch) {
      const regex = new RegExp(normalizedSearch, "i");
      basePipeline.push({
        $match: {
          $or: [
            { "method.paymentMethod": regex },
            { transactionType: regex },
            { direction: regex },
            { referenceType: regex },
            { title: regex },
            { notes: regex },
          ],
        },
      });
    }

    const [countResult] = await PaymentMethodTransaction.aggregate([
      ...basePipeline,
      { $count: "count" },
    ]);

    const totalItems = countResult?.count || 0;

    const transactions = await PaymentMethodTransaction.aggregate([
      ...basePipeline,
      { $sort: sortMap[normalizedSortBy] },
      { $skip: offset },
      { $limit: limitNum },
      {
        $addFields: {
          signed_amount: {
            $cond: [
              { $eq: ["$direction", "IN"] },
              "$amount",
              { $multiply: ["$amount", -1] },
            ],
          },
        },
      },
      {
        $project: {
          id: "$_id",
          payment_method_id: "$paymentMethodId",
          payment_method: { $ifNull: ["$method.paymentMethod", "Unknown Payment Method"] },
          payment_method_type: { $ifNull: ["$method.type", ""] },
          transaction_type: "$transactionType",
          direction: 1,
          amount: 1,
          reference_type: "$referenceType",
          reference_id: "$referenceId",
          title: 1,
          notes: 1,
          transaction_date: "$transactionDate",
          created_at: "$createdAt",
          updated_at: "$updatedAt",
          signed_amount: 1,
          _id: 0,
        },
      },
    ]);

    const [statsResult] = await PaymentMethodTransaction.aggregate([
      ...basePipeline,
      {
        $group: {
          _id: null,
          total_in: {
            $sum: { $cond: [{ $eq: ["$direction", "IN"] }, "$amount", 0] },
          },
          total_out: {
            $sum: { $cond: [{ $eq: ["$direction", "OUT"] }, "$amount", 0] },
          },
          total_transactions: { $sum: 1 },
        },
      },
    ]);

    const stats = statsResult || {
      total_in: 0,
      total_out: 0,
      total_transactions: 0,
    };

    const totalPages = Math.ceil(totalItems / limitNum);

    return res.status(200).json({
      success: true,
      message: "Payment transactions fetched successfully",
      data: transactions,
      stats: {
        total_in: stats.total_in,
        total_out: stats.total_out,
        net_amount: stats.total_in - stats.total_out,
        total_transactions: stats.total_transactions,
      },
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalItems,
        totalPages,
        hasNextPage: pageNum < totalPages,
        hasPreviousPage: pageNum > 1,
      },
      filters: {
        search: normalizedSearch,
        payment_method_id,
        transaction_type,
        direction,
        reference_type,
        dateFrom,
        dateTo,
        sortBy: normalizedSortBy,
      },
    });
  } catch (error) {
    console.error("Get payment transactions error:", error.message);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};
