import mongoose from "mongoose";
import PaymentMethod from "../models/PaymentMethod.js";
import PaymentMethodTransaction from "../models/PaymentMethodTransaction.js";

const toApiMethod = (doc) => ({
  id: doc._id.toString(),
  payment_method: doc.paymentMethod,
  type: doc.type,
  qr_code: doc.qrCode || null,
  status: doc.status,
  notes: doc.notes || null,
  is_deleted: doc.isDeleted,
  created_at: doc.createdAt,
  updated_at: doc.updatedAt,
});

const toApiTransaction = (doc) => ({
  id: doc._id.toString(),
  payment_method_id: doc.paymentMethodId?.toString(),
  transaction_type: doc.transactionType,
  direction: doc.direction,
  amount: doc.amount,
  reference_type: doc.referenceType,
  reference_id: doc.referenceId ? doc.referenceId.toString() : null,
  title: doc.title,
  notes: doc.notes,
  transaction_date: doc.transactionDate,
  created_at: doc.createdAt,
  updated_at: doc.updatedAt,
});

async function getLedgerBalance(paymentMethodId) {
  const agg = await PaymentMethodTransaction.aggregate([
    { $match: { paymentMethodId: new mongoose.Types.ObjectId(paymentMethodId) } },
    {
      $group: {
        _id: null,
        total_in: { $sum: { $cond: [{ $eq: ["$direction", "IN"] }, "$amount", 0] } },
        total_out: { $sum: { $cond: [{ $eq: ["$direction", "OUT"] }, "$amount", 0] } },
      },
    },
  ]);

  const totalIn = agg[0]?.total_in || 0;
  const totalOut = agg[0]?.total_out || 0;

  return totalIn - totalOut;
}

export const createPaymentMethod = async (req, res) => {
  try {
    const { payment_method, type, qr_code, status, notes } = req.body;

    if (!payment_method || !type) {
      return res
        .status(400)
        .json({ success: false, message: "Payment method and type are required." });
    }

    const existingMethod = await PaymentMethod.findOne({
      paymentMethod: payment_method,
    });

    if (existingMethod) {
      return res
        .status(400)
        .json({ success: false, message: "Payment method already exists." });
    }

    const created = await PaymentMethod.create({
      paymentMethod: payment_method.trim(),
      type: type.trim(),
      qrCode: qr_code || "",
      status: status || "Active",
      notes: notes?.trim() || "",
    });

    return res.status(201).json({
      success: true,
      message: "Payment method created successfully",
      data: toApiMethod(created),
    });
  } catch (error) {
    console.log("Error while creating payment method: ", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getPaymentMethods = async (req, res) => {
  try {
    const pageNum = Math.max(parseInt(req.query.page) || 1, 1);
    const limitNum = Math.max(parseInt(req.query.limit) || 10, 1);
    const offset = (pageNum - 1) * limitNum;

    const status = req.query.status?.trim();

    if (status && !["Active", "Inactive"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment method status",
      });
    }

    const filter = { isDeleted: false, ...(status ? { status } : {}) };

    const [totalCount, allMatchingIds, methods] = await Promise.all([
      PaymentMethod.countDocuments(filter),
      PaymentMethod.find(filter).distinct("_id"),
      PaymentMethod.find(filter)
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limitNum),
    ]);

    const pageIds = methods.map((m) => m._id);

    const perMethodAgg = await PaymentMethodTransaction.aggregate([
      { $match: { paymentMethodId: { $in: pageIds } } },
      {
        $group: {
          _id: "$paymentMethodId",
          total_in: {
            $sum: { $cond: [{ $eq: ["$direction", "IN"] }, "$amount", 0] },
          },
          total_out: {
            $sum: { $cond: [{ $eq: ["$direction", "OUT"] }, "$amount", 0] },
          },
          transaction_count: { $sum: 1 },
        },
      },
    ]);

    const byId = Object.fromEntries(
      perMethodAgg.map((a) => [a._id.toString(), a]),
    );

    const data = methods.map((m) => {
      const agg = byId[m._id.toString()] || {
        total_in: 0,
        total_out: 0,
        transaction_count: 0,
      };

      return {
        ...toApiMethod(m),
        total_in: agg.total_in,
        total_out: agg.total_out,
        current_balance: agg.total_in - agg.total_out,
        transaction_count: agg.transaction_count,
      };
    });

    const globalAgg = await PaymentMethodTransaction.aggregate([
      { $match: { paymentMethodId: { $in: allMatchingIds } } },
      {
        $group: {
          _id: null,
          total_in: {
            $sum: { $cond: [{ $eq: ["$direction", "IN"] }, "$amount", 0] },
          },
          total_out: {
            $sum: { $cond: [{ $eq: ["$direction", "OUT"] }, "$amount", 0] },
          },
        },
      },
    ]);

    const globalStats = globalAgg[0] || { total_in: 0, total_out: 0 };

    res.json({
      success: true,
      data,
      totalCount,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(totalCount / limitNum),
      stats: {
        total_in: globalStats.total_in,
        total_out: globalStats.total_out,
        total_balance: globalStats.total_in - globalStats.total_out,
      },
    });
  } catch (error) {
    console.log("Error while fetching payment methods: ", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch payment methods",
      error: error.message,
    });
  }
};

export const updatePaymentMethod = async (req, res) => {
  try {
    const { id } = req.params;

    const { payment_method, type, qr_code, status, notes } = req.body;

    const existingMethod = await PaymentMethod.findById(id);

    if (!existingMethod) {
      return res.status(404).json({ success: false, message: "Payment method not found." });
    }

    existingMethod.paymentMethod = payment_method.trim();
    existingMethod.type = type.trim();
    existingMethod.qrCode = qr_code || "";
    existingMethod.status = status || "Active";
    existingMethod.notes = notes?.trim() || "";

    await existingMethod.save();

    res.json({
      success: true,
      message: "Payment method updated successfully",
      data: toApiMethod(existingMethod),
    });
  } catch (error) {
    console.log("Error while updating payment method: ", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deletePaymentMethod = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { id } = req.params;
    let result;

    await session.withTransaction(async () => {
      const existingMethod = await PaymentMethod.findOne({
        _id: id,
        isDeleted: false,
      }).session(session);

      if (!existingMethod) {
        const error = new Error("Payment method not found.");
        error.statusCode = 404;
        throw error;
      }

      const currentBalance = await getLedgerBalance(id);

      if (currentBalance > 0) {
        await PaymentMethodTransaction.create(
          [
            {
              paymentMethodId: id,
              transactionType: "WITHDRAWAL",
              direction: "OUT",
              amount: currentBalance,
              notes: `Auto withdrawal while deleting ${existingMethod.paymentMethod}`,
            },
          ],
          { session },
        );
      }

      if (currentBalance < 0) {
        await PaymentMethodTransaction.create(
          [
            {
              paymentMethodId: id,
              transactionType: "ADD_CAPITAL",
              direction: "IN",
              amount: Math.abs(currentBalance),
              notes: `Auto capital adjustment while deleting ${existingMethod.paymentMethod}`,
            },
          ],
          { session },
        );
      }

      existingMethod.isDeleted = true;
      existingMethod.deletedAt = new Date();
      await existingMethod.save({ session });

      result = {
        paymentMethod: existingMethod.paymentMethod,
        closingBalance: currentBalance,
      };
    });

    res.json({
      success: true,
      message: "Payment method deleted successfully",
      paymentMethod: result.paymentMethod,
      closingBalance: result.closingBalance,
    });
  } catch (error) {
    console.log("Error while deleting payment method: ", error);

    if (error.statusCode === 404) {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: error.message,
    });
  } finally {
    session.endSession();
  }
};

export const addPaymentMethodFunds = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, title, notes } = req.body;

    const paymentMethod = await PaymentMethod.findById(id);

    if (!paymentMethod) {
      return res.status(404).json({
        success: false,
        message: "Payment method not found",
      });
    }

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Amount must be greater than 0",
      });
    }

    const transaction = await PaymentMethodTransaction.create({
      paymentMethodId: id,
      transactionType: "CAPITAL_ADDITION",
      direction: "IN",
      amount: Number(amount),
      referenceType: "manual",
      title: title?.trim() || "Capital added",
      notes: notes?.trim() || "",
    });

    return res.status(201).json({
      success: true,
      message: "Funds added successfully",
      data: toApiTransaction(transaction),
    });
  } catch (error) {
    console.error("Add payment method funds error:", error.message);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to add funds",
    });
  }
};

export const withdrawPaymentMethodFunds = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, title, notes } = req.body;

    const paymentMethod = await PaymentMethod.findById(id);

    if (!paymentMethod) {
      return res.status(404).json({
        success: false,
        message: "Payment method not found",
      });
    }

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Amount must be greater than 0",
      });
    }

    const currentBalance = await getLedgerBalance(id);

    if (Number(amount) > currentBalance) {
      return res.status(400).json({
        success: false,
        message: "Insufficient balance in this payment method",
      });
    }

    const transaction = await PaymentMethodTransaction.create({
      paymentMethodId: id,
      transactionType: "WITHDRAWAL",
      direction: "OUT",
      amount: Number(amount),
      referenceType: "manual",
      title: title?.trim() || "Withdrawn funds",
      notes: notes?.trim() || "",
    });

    return res.status(201).json({
      success: true,
      message: "Funds withdrawn successfully",
      data: toApiTransaction(transaction),
    });
  } catch (error) {
    console.error("Withdraw payment method funds error:", error.message);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to withdraw funds",
    });
  }
};

export const transferPaymentMethodFunds = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { from_payment_method_id, to_payment_method_id, amount, notes } =
      req.body;

    const fromId = from_payment_method_id;
    const toId = to_payment_method_id;
    const transferAmount = Number(amount);

    if (!fromId || !toId) {
      return res.status(400).json({
        success: false,
        message: "From and to payment methods are required",
      });
    }

    if (fromId === toId) {
      return res.status(400).json({
        success: false,
        message: "Cannot transfer to the same payment method",
      });
    }

    if (!transferAmount || transferAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Amount must be greater than 0",
      });
    }

    const [fromMethod, toMethod] = await Promise.all([
      PaymentMethod.findById(fromId),
      PaymentMethod.findById(toId),
    ]);

    if (!fromMethod) {
      return res.status(400).json({
        success: false,
        message: "Source payment method not found",
      });
    }

    if (!toMethod) {
      return res.status(400).json({
        success: false,
        message: "Destination payment method not found",
      });
    }

    const currentBalance = await getLedgerBalance(fromId);

    if (transferAmount > currentBalance) {
      return res.status(400).json({
        success: false,
        message: "Insufficient balance in source payment method",
      });
    }

    const transferGroup = `TRANSFER-${Date.now()}-${fromId}-${toId}`;
    let result;

    await session.withTransaction(async () => {
      const [outTransaction] = await PaymentMethodTransaction.create(
        [
          {
            paymentMethodId: fromId,
            transactionType: "TRANSFER_OUT",
            direction: "OUT",
            amount: transferAmount,
            referenceType: "transfer",
            title: `Transfer to ${toMethod.paymentMethod}`,
            notes: notes?.trim() || transferGroup,
          },
        ],
        { session },
      );

      const [inTransaction] = await PaymentMethodTransaction.create(
        [
          {
            paymentMethodId: toId,
            transactionType: "TRANSFER_IN",
            direction: "IN",
            amount: transferAmount,
            referenceType: "transfer",
            referenceId: outTransaction._id,
            title: `Transfer from ${fromMethod.paymentMethod}`,
            notes: notes?.trim() || transferGroup,
          },
        ],
        { session },
      );

      result = {
        transfer_out_id: outTransaction._id.toString(),
        transfer_in_id: inTransaction._id.toString(),
      };
    });

    return res.status(201).json({
      success: true,
      message: "Funds transferred successfully",
      data: result,
    });
  } catch (error) {
    console.error("Transfer payment method funds error:", error.message);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to transfer funds",
    });
  } finally {
    session.endSession();
  }
};
