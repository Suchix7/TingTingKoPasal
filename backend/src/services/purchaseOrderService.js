import mongoose from "mongoose";
import PurchaseOrder from "../models/PurchaseOrder.js";
import Product from "../models/Product.js";
import ProductBatch from "../models/ProductBatch.js";
import PaymentMethodTransaction from "../models/PaymentMethodTransaction.js";
import InventoryTransaction from "../models/InventoryTransaction.js";

export function serializePurchaseOrder(po, extra = {}) {
  const obj = po.toObject ? po.toObject() : po;
  return {
    id: String(obj._id),
    supplier_id: obj.supplierId ? String(obj.supplierId) : null,
    order_date: obj.orderDate,
    total_cost: obj.totalCost,
    ordering_cost: obj.orderingCost,
    status: obj.status,
    notes: obj.notes,
    created_at: obj.createdAt,
    updated_at: obj.updatedAt,
    items: (obj.items || []).map((item) => ({
      product_id: String(item.productId),
      batch_id: item.batchId ? String(item.batchId) : null,
      quantity: item.quantity,
      unit_cost: item.unitCost,
      total_cost: item.totalCost,
    })),
    payments: (obj.payments || []).map((payment) => ({
      payment_method_id: String(payment.paymentMethodId),
      amount: payment.amount,
      payment_date: payment.paymentDate,
      notes: payment.notes,
    })),
    ...extra,
  };
}

export async function createPurchaseOrder(body) {
  const {
    supplier_id = null,
    ordering_cost = 0,
    status = "Pending",
    notes = null,
    items,
    payments = [],
  } = body;

  if (!["Pending", "Received", "Cancelled"].includes(status)) {
    const err = new Error("Invalid purchase order status");
    err.statusCode = 400;
    throw err;
  }
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Purchase order must contain at least one item");
  }
  if (!Array.isArray(payments)) {
    throw new Error("Payments must be an array");
  }

  let totalCost = 0;
  const preparedItems = [];
  for (const item of items) {
    const quantity = Number(item.quantity);
    const unitCost = Number(item.unit_cost);
    const batchId = item.batch_id || null;

    if (!item.product_id || quantity <= 0 || unitCost < 0) {
      throw new Error("Invalid purchase order item");
    }
    if (batchId) {
      const batch = await ProductBatch.findById(batchId);
      if (!batch) throw new Error("Product batch not found");
      if (String(batch.productId) !== String(item.product_id)) {
        throw new Error("Batch does not belong to selected product");
      }
    }
    totalCost += quantity * unitCost;
    preparedItems.push({
      productId: item.product_id,
      batchId,
      quantity,
      unitCost,
      totalCost: quantity * unitCost,
    });
  }

  const orderingCostAmount = Number(ordering_cost || 0);
  const grandTotal = totalCost + orderingCostAmount;

  let totalPaid = 0;
  const preparedPayments = [];
  for (const payment of payments) {
    const paymentMethodId = payment.payment_method_id;
    const amount = Number(payment.amount);
    if (!paymentMethodId || amount <= 0) {
      throw new Error("Invalid purchase order payment");
    }
    totalPaid += amount;
    preparedPayments.push({ paymentMethodId, amount });
  }

  if (totalPaid > grandTotal) {
    throw new Error("Paid amount cannot be greater than purchase order total");
  }

  const po = await PurchaseOrder.create({
    supplierId: supplier_id || null,
    totalCost: grandTotal,
    orderingCost: orderingCostAmount,
    status,
    notes: notes ? notes.trim() : null,
    items: preparedItems,
    payments: preparedPayments,
  });

  return serializePurchaseOrder(po);
}

export async function receivePurchaseOrder(id, newStatus) {
  const session = await mongoose.startSession();
  try {
    let resultDoc;
    await session.withTransaction(async () => {
      const po = await PurchaseOrder.findById(id).session(session);
      if (!po) {
        const err = new Error("Purchase order not found");
        err.statusCode = 404;
        throw err;
      }
      if (po.status === newStatus) {
        resultDoc = po;
        return;
      }
      if (po.status === "Cancelled") throw new Error("Cancelled purchase order cannot be updated");
      if (po.status === "Received") throw new Error("Received purchase order cannot be changed");

      if (newStatus === "Received") {
        for (const item of po.items) {
          if (item.batchId) {
            const updated = await ProductBatch.findOneAndUpdate(
              { _id: item.batchId, productId: item.productId },
              { $inc: { quantity: item.quantity } },
              { session },
            );
            if (!updated) throw new Error(`Batch ${item.batchId} not found for product ID ${item.productId}`);
          } else {
            const updated = await Product.findOneAndUpdate(
              { _id: item.productId },
              {
                $inc: { "stock.currentStock": item.quantity },
                $set: { "stock.lastRestockedAt": new Date() },
              },
              { session },
            );
            if (!updated) throw new Error(`Inventory record not found for product ID ${item.productId}`);
          }
          await InventoryTransaction.create(
            [
              {
                productId: item.productId,
                batchId: item.batchId || null,
                type: "IN",
                quantity: item.quantity,
                referenceType: "PURCHASE_ORDER",
                referenceId: po._id,
              },
            ],
            { session },
          );
        }

        for (const payment of po.payments) {
          await PaymentMethodTransaction.create(
            [
              {
                paymentMethodId: payment.paymentMethodId,
                transactionType: "PURCHASE_ORDER_PAYMENT",
                direction: "OUT",
                amount: payment.amount,
                referenceType: "purchase_order_payment",
                referenceId: po._id,
                title: `Purchase Order #${po._id}`,
                notes: po.notes || null,
              },
            ],
            { session },
          );
        }
      }

      po.status = newStatus;
      await po.save({ session });
      resultDoc = po;
    });
    return serializePurchaseOrder(resultDoc);
  } finally {
    session.endSession();
  }
}

export async function deletePurchaseOrder(id) {
  const po = await PurchaseOrder.findById(id);
  if (!po) {
    const err = new Error("Purchase order not found");
    err.statusCode = 404;
    throw err;
  }
  if (po.status === "Received") {
    const err = new Error("Received purchase order cannot be deleted");
    err.statusCode = 400;
    throw err;
  }
  await PurchaseOrder.deleteOne({ _id: id });
}
