import mongoose from "mongoose";
import Sale from "../models/Sale.js";
import Product from "../models/Product.js";
import ProductBatch from "../models/ProductBatch.js";
import Customer from "../models/Customer.js";
import PaymentMethod from "../models/PaymentMethod.js";
import PaymentMethodTransaction from "../models/PaymentMethodTransaction.js";
import InventoryTransaction from "../models/InventoryTransaction.js";

const round2 = (n) => Number(Number(n).toFixed(2));
const eq2 = (a, b) => round2(a) === round2(b);

export function serializeSale(sale) {
  const obj = sale.toObject ? sale.toObject() : sale;
  return {
    id: String(obj._id),
    invoice_no: obj.invoiceNo,
    customer_id: obj.customerId ? String(obj.customerId) : null,
    customer_name: obj.customerName || null,
    customer_phone: obj.customerPhone || null,
    subtotal: obj.subtotal,
    discount_amount: obj.discountAmount,
    tax_amount: obj.taxAmount,
    is_tax_inclusive: obj.isTaxInclusive,
    grand_total: obj.grandTotal,
    paid_amount: obj.paidAmount,
    change_amount: obj.changeAmount,
    remaining_amount: obj.remainingAmount,
    profit_amount: obj.profitAmount,
    payment_status: obj.paymentStatus,
    sale_status: obj.saleStatus,
    notes: obj.notes,
    payment_proof_url: obj.paymentProofUrl || null,
    created_at: obj.createdAt,
    updated_at: obj.updatedAt,
    items: (obj.items || []).map((item) => ({
      product_id: String(item.productId),
      batch_id: item.batchId ? String(item.batchId) : null,
      product_name: item.productName,
      sku: item.sku,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      discount_amount: item.discountAmount,
      tax_amount: item.taxAmount,
      tax_inclusive: item.taxInclusive,
      total_price: item.totalPrice,
      cost_price: item.costPrice,
      profit_amount: item.profitAmount,
    })),
    payments: (obj.payments || []).map((payment) => {
      const isPopulated =
        payment.paymentMethodId && typeof payment.paymentMethodId === "object";
      return {
        payment_method_id: isPopulated
          ? String(payment.paymentMethodId._id)
          : String(payment.paymentMethodId),
        payment_method: isPopulated
          ? payment.paymentMethodId.paymentMethod
          : null,
        payment_method_type: isPopulated ? payment.paymentMethodId.type : null,
        amount: payment.amount,
        created_at: payment.createdAt,
      };
    }),
  };
}

export const PAYMENT_METHOD_POPULATE = {
  path: "payments.paymentMethodId",
  select: "paymentMethod type",
};

async function decrementStock(productId, batchId, quantity, session) {
  if (batchId) {
    const batch = await ProductBatch.findOne({ _id: batchId, productId }).session(session);
    if (!batch) throw new Error(`Batch with ID ${batchId} not found`);
    if (Number(batch.quantity) < quantity) {
      throw new Error(
        `Insufficient stock in batch ${batch.batchNumber}. Available stock: ${batch.quantity}`,
      );
    }
    const updated = await ProductBatch.findOneAndUpdate(
      { _id: batchId, productId, quantity: { $gte: quantity } },
      { $inc: { quantity: -quantity } },
      { session },
    );
    if (!updated) throw new Error(`Unable to update batch ${batchId}`);
    return Number(batch.costPrice || 0);
  }

  const product = await Product.findOne({ _id: productId, isDeleted: false }).session(session);
  if (!product) throw new Error(`Product with ID ${productId} not found`);
  if (Number(product.stock.currentStock) < quantity) {
    throw new Error(
      `Insufficient standard stock for ${product.productName}. Available stock: ${product.stock.currentStock}`,
    );
  }
  const updated = await Product.findOneAndUpdate(
    { _id: productId, "stock.currentStock": { $gte: quantity } },
    { $inc: { "stock.currentStock": -quantity } },
    { session },
  );
  if (!updated) throw new Error(`Unable to update inventory for ${product.productName}`);
  return Number(product.costPrice || 0);
}

async function restoreStock(productId, batchId, quantity, session) {
  if (batchId) {
    await ProductBatch.updateOne(
      { _id: batchId },
      { $inc: { quantity: Number(quantity) } },
      { session },
    );
    return;
  }
  await Product.updateOne(
    { _id: productId },
    { $inc: { "stock.currentStock": Number(quantity) } },
    { session },
  );
}

async function getItemCostPrice(productId, batchId, session) {
  if (batchId) {
    const batch = await ProductBatch.findOne({ _id: batchId, productId }).session(session);
    if (!batch) throw new Error("Selected batch does not belong to this product");
    return Number(batch.costPrice || 0);
  }
  const product = await Product.findById(productId).session(session);
  if (!product) throw new Error(`Product with ID ${productId} not found`);
  return Number(product.costPrice || 0);
}

export async function createSale(body) {
  const {
    invoice_no,
    customer_id,
    customer_name,
    customer_phone,
    subtotal,
    discount_amount = 0,
    grand_total,
    paid_amount = 0,
    payment_status,
    sale_status = "Completed",
    notes,
    payments,
    items,
  } = body;

  if (!invoice_no || subtotal === undefined || grand_total === undefined) {
    const err = new Error("Please provide all required sale fields");
    err.statusCode = 400;
    throw err;
  }
  if (!Array.isArray(items) || items.length === 0) {
    const err = new Error("Sale must contain at least one item");
    err.statusCode = 400;
    throw err;
  }
  if (!Array.isArray(payments) || payments.length === 0) {
    const err = new Error("Sale must contain at least one payment");
    err.statusCode = 400;
    throw err;
  }
  if (!["Paid", "Unpaid", "Partial"].includes(payment_status || "Paid")) {
    const err = new Error("Invalid payment status");
    err.statusCode = 400;
    throw err;
  }
  if (!["Completed", "Cancelled", "Returned"].includes(sale_status)) {
    const err = new Error("Invalid sale status");
    err.statusCode = 400;
    throw err;
  }

  if (customer_id) {
    const customer = await Customer.findById(customer_id);
    if (!customer) {
      const err = new Error(`Customer with ID ${customer_id} not found`);
      err.statusCode = 400;
      throw err;
    }
  }

  const existingSale = await Sale.findOne({ invoiceNo: invoice_no.trim() });
  if (existingSale) {
    const err = new Error("Invoice number already exists");
    err.statusCode = 409;
    throw err;
  }

  for (const payment of payments) {
    if (!payment.payment_method_id || payment.amount === undefined) {
      const err = new Error("Please provide payment method and amount");
      err.statusCode = 400;
      throw err;
    }
    if (Number(payment.amount) <= 0) {
      const err = new Error("Payment amount must be greater than 0");
      err.statusCode = 400;
      throw err;
    }
    const paymentMethod = await PaymentMethod.findById(payment.payment_method_id);
    if (!paymentMethod) {
      const err = new Error(
        `Payment method with ID ${payment.payment_method_id} not found`,
      );
      err.statusCode = 400;
      throw err;
    }
  }

  let computedSubtotal = 0;
  let computedTaxAmount = 0;
  let computedItemsTotal = 0;
  let saleProfitAmount = 0;
  const productCache = new Map();

  for (const item of items) {
    if (
      !item.product_id ||
      item.quantity === undefined ||
      item.unit_price === undefined ||
      item.total_price === undefined
    ) {
      const err = new Error("Please provide all required sale item fields");
      err.statusCode = 400;
      throw err;
    }

    const quantity = Number(item.quantity);
    const unitPrice = Number(item.unit_price);
    const itemDiscountAmount = Number(item.discount_amount || 0);
    const itemTaxAmount = Number(item.tax_amount || 0);
    const itemTotalPrice = Number(item.total_price);
    const isItemTaxInclusive = Boolean(item.tax_inclusive);

    if (
      !Number.isFinite(quantity) ||
      !Number.isFinite(unitPrice) ||
      !Number.isFinite(itemDiscountAmount) ||
      !Number.isFinite(itemTaxAmount) ||
      !Number.isFinite(itemTotalPrice)
    ) {
      const err = new Error("Invalid numeric sale item values");
      err.statusCode = 400;
      throw err;
    }
    if (
      quantity <= 0 ||
      unitPrice < 0 ||
      itemDiscountAmount < 0 ||
      itemTaxAmount < 0 ||
      itemTotalPrice < 0
    ) {
      const err = new Error("Invalid sale item values");
      err.statusCode = 400;
      throw err;
    }

    const product = await Product.findOne({ _id: item.product_id, isDeleted: false });
    if (!product) {
      const err = new Error(`Product with ID ${item.product_id} not found`);
      err.statusCode = 400;
      throw err;
    }
    productCache.set(String(item.product_id), product);

    const hasBatch = item.batch_id !== undefined && item.batch_id !== null && item.batch_id !== "";
    let costPrice = Number(product.costPrice || 0);

    if (hasBatch) {
      const batch = await ProductBatch.findOne({ _id: item.batch_id, productId: item.product_id });
      if (!batch) {
        const err = new Error("Selected batch does not belong to this product");
        err.statusCode = 400;
        throw err;
      }
      if (Number(batch.quantity) < quantity) {
        const err = new Error(
          `Insufficient stock in selected batch. Available stock: ${batch.quantity}`,
        );
        err.statusCode = 400;
        throw err;
      }
      costPrice = Number(batch.costPrice || 0);
    } else {
      if (Number(product.stock.currentStock) < quantity) {
        const err = new Error(
          `Insufficient standard stock for ${product.productName}. Available stock: ${product.stock.currentStock}`,
        );
        err.statusCode = 400;
        throw err;
      }
    }

    const grossItemAmount = unitPrice * quantity - itemDiscountAmount;
    if (grossItemAmount < 0) {
      const err = new Error("Item discount cannot be greater than item amount");
      err.statusCode = 400;
      throw err;
    }
    const expectedItemTotal = isItemTaxInclusive
      ? grossItemAmount
      : grossItemAmount + itemTaxAmount;
    if (!eq2(expectedItemTotal, itemTotalPrice)) {
      const err = new Error("Invalid sale item total price");
      err.statusCode = 400;
      throw err;
    }

    const revenueExcludingTax = isItemTaxInclusive
      ? grossItemAmount - itemTaxAmount
      : grossItemAmount;
    const estimatedCost = costPrice * quantity;
    const itemProfitAmount = revenueExcludingTax - estimatedCost;

    computedSubtotal += unitPrice * quantity;
    computedTaxAmount += itemTaxAmount;
    computedItemsTotal += itemTotalPrice;
    saleProfitAmount += itemProfitAmount;
  }

  if (!eq2(computedSubtotal, subtotal)) {
    const err = new Error(
      "Subtotal must equal total item amount before item discount and tax",
    );
    err.statusCode = 400;
    throw err;
  }
  if (!eq2(computedTaxAmount, body.tax_amount || 0)) {
    const err = new Error("Sale tax amount must equal total item tax amount");
    err.statusCode = 400;
    throw err;
  }
  const computedGrandTotal = computedItemsTotal - Number(discount_amount || 0);
  if (!eq2(computedGrandTotal, grand_total)) {
    const err = new Error("Grand total must equal item totals minus sale discount");
    err.statusCode = 400;
    throw err;
  }
  saleProfitAmount -= Number(discount_amount || 0);

  const totalPaymentAmount = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  if (!eq2(totalPaymentAmount, paid_amount)) {
    const err = new Error("Paid amount must match total payment amounts");
    err.statusCode = 400;
    throw err;
  }

  let computedChangeAmount = 0;
  let computedRemainingAmount = 0;
  if (Number(paid_amount) > Number(grand_total)) {
    computedChangeAmount = Number(paid_amount) - Number(grand_total);
  }
  if (Number(paid_amount) < Number(grand_total)) {
    computedRemainingAmount = Number(grand_total) - Number(paid_amount);
  }
  const computedPaymentStatus =
    computedRemainingAmount > 0 ? (Number(paid_amount) > 0 ? "Partial" : "Unpaid") : "Paid";

  const hasInclusiveTaxItem = items.some((item) => Boolean(item.tax_inclusive));

  const session = await mongoose.startSession();
  try {
    let saleDoc;
    await session.withTransaction(async () => {
      let customerSnapshotName = customer_name ? customer_name.trim() : null;
      let customerSnapshotPhone = customer_phone ? customer_phone.trim() : null;

      if (customer_id) {
        const customer = await Customer.findById(customer_id).session(session);
        if (!customer) throw new Error(`Customer with ID ${customer_id} not found`);
        customerSnapshotName = customerSnapshotName || customer.name;
        customerSnapshotPhone = customerSnapshotPhone || customer.phone;
      }

      const itemsForSale = [];
      for (const item of items) {
        const quantity = Number(item.quantity);
        const hasBatch = item.batch_id !== undefined && item.batch_id !== null && item.batch_id !== "";
        const batchId = hasBatch ? item.batch_id : null;
        const product = productCache.get(String(item.product_id));

        const costPrice = await decrementStock(item.product_id, batchId, quantity, session);

        const unitPrice = Number(item.unit_price);
        const itemDiscountAmount = Number(item.discount_amount || 0);
        const itemTaxAmount = Number(item.tax_amount || 0);
        const isItemTaxInclusive = item.tax_inclusive ? true : false;
        const grossRevenue = unitPrice * quantity - itemDiscountAmount;
        const revenueExcludingTax = isItemTaxInclusive ? grossRevenue - itemTaxAmount : grossRevenue;
        const totalCost = costPrice * quantity;
        const profitAmount = revenueExcludingTax - totalCost;

        itemsForSale.push({
          productId: item.product_id,
          batchId,
          productName: product.productName,
          sku: product.sku,
          quantity,
          unitPrice,
          discountAmount: itemDiscountAmount,
          taxAmount: itemTaxAmount,
          taxInclusive: isItemTaxInclusive,
          totalPrice: round2(Number(item.total_price)),
          costPrice,
          profitAmount: round2(profitAmount),
        });

        await InventoryTransaction.create(
          [
            {
              productId: item.product_id,
              batchId,
              type: "OUT",
              quantity,
              referenceType: "SALE",
              referenceId: null, // set after sale is created
            },
          ],
          { session },
        );
      }

      const paymentsForSale = payments.map((p) => ({
        paymentMethodId: p.payment_method_id,
        amount: Number(p.amount),
        createdAt: new Date(),
      }));

      const [sale] = await Sale.create(
        [
          {
            invoiceNo: invoice_no.trim(),
            customerId: customer_id || null,
            customerName: customerSnapshotName,
            customerPhone: customerSnapshotPhone,
            subtotal: Number(subtotal),
            discountAmount: Number(discount_amount),
            taxAmount: computedTaxAmount,
            isTaxInclusive: hasInclusiveTaxItem,
            grandTotal: Number(grand_total),
            paidAmount: Number(paid_amount),
            changeAmount: computedChangeAmount,
            remainingAmount: computedRemainingAmount,
            profitAmount: round2(saleProfitAmount),
            paymentStatus: computedPaymentStatus,
            saleStatus: sale_status,
            notes: notes ? notes.trim() : null,
            items: itemsForSale,
            payments: paymentsForSale,
          },
        ],
        { session },
      );

      await InventoryTransaction.updateMany(
        { referenceType: "SALE", referenceId: null, productId: { $in: itemsForSale.map((i) => i.productId) } },
        { $set: { referenceId: sale._id } },
        { session },
      );

      for (const payment of payments) {
        await PaymentMethodTransaction.create(
          [
            {
              paymentMethodId: payment.payment_method_id,
              transactionType: "SALE_PAYMENT",
              direction: "IN",
              amount: Number(payment.amount),
              referenceType: "sale",
              referenceId: sale._id,
              title: `Sale #${sale._id}`,
              notes: notes ? notes.trim() : null,
            },
          ],
          { session },
        );
      }

      if (
        sale_status === "Completed" &&
        customer_id &&
        (computedRemainingAmount > 0 || computedChangeAmount > 0)
      ) {
        const customer = await Customer.findById(customer_id).session(session);
        if (!customer) throw new Error(`Customer with id ${customer_id} not found`);
        const nextCreditAmount = Math.max(
          Number(customer.creditAmount || 0) + computedRemainingAmount - computedChangeAmount,
          0,
        );
        if (Number(customer.creditLimit) < nextCreditAmount) {
          throw new Error("Customer credit limit exceeded");
        }
        customer.creditAmount = nextCreditAmount;
        await customer.save({ session });
      }

      saleDoc = sale;
    });
    await saleDoc.populate(PAYMENT_METHOD_POPULATE);
    return serializeSale(saleDoc);
  } finally {
    session.endSession();
  }
}

export async function updateSale(id, body) {
  const existingSale = await Sale.findById(id);
  if (!existingSale) {
    const err = new Error("Sale not found");
    err.statusCode = 404;
    throw err;
  }

  const updatedPaymentStatus = body.payment_status ?? existingSale.paymentStatus;
  const updatedSaleStatus = body.sale_status ?? existingSale.saleStatus;

  if (!["Paid", "Unpaid", "Partial", "Refunded", "Cancelled"].includes(updatedPaymentStatus)) {
    const err = new Error("Invalid payment status");
    err.statusCode = 400;
    throw err;
  }
  if (!["Completed", "Cancelled", "Returned"].includes(updatedSaleStatus)) {
    const err = new Error("Invalid sale status");
    err.statusCode = 400;
    throw err;
  }
  if (body.payments !== undefined && !Array.isArray(body.payments)) {
    const err = new Error("Payments must be an array");
    err.statusCode = 400;
    throw err;
  }
  if (body.items !== undefined && !Array.isArray(body.items)) {
    const err = new Error("Items must be an array");
    err.statusCode = 400;
    throw err;
  }

  const session = await mongoose.startSession();
  try {
    let resultDoc;
    await session.withTransaction(async () => {
      const sale = await Sale.findById(id).session(session);
      const {
        customer_id,
        customer_name,
        customer_phone,
        subtotal,
        discount_amount,
        tax_amount,
        payments,
        items,
        notes,
      } = body;

      const hasPayments = payments !== undefined;
      const hasItems = items !== undefined;
      const oldItems = sale.items;
      const wasCompleted = sale.saleStatus === "Completed";
      const updatedCustomerId = customer_id !== undefined ? customer_id : sale.customerId;
      const isCompleted = updatedSaleStatus === "Completed";

      const updatedDiscount =
        discount_amount !== undefined ? Number(discount_amount) : Number(sale.discountAmount || 0);
      if (updatedDiscount < 0) throw new Error("Discount cannot be negative");
      if (hasItems && items.length === 0) throw new Error("Sale must have at least one item");

      // Reverse stock for old items if the sale was previously completed
      // (batch-aware: restores to the specific batch the item was sold from,
      // or to the product's standard stock otherwise)
      if (wasCompleted) {
        for (const item of oldItems) {
          await restoreStock(item.productId, item.batchId, item.quantity, session);
          await InventoryTransaction.create(
            [
              {
                productId: item.productId,
                batchId: item.batchId || null,
                type: "IN",
                quantity: Number(item.quantity),
                referenceType: updatedSaleStatus === "Returned" ? "SALE_RETURN" : "SALE_CANCELLED",
                referenceId: sale._id,
              },
            ],
            { session },
          );
        }
      }

      let finalItems;

      if (hasItems) {
        const preparedItems = [];
        for (const item of items) {
          const productId = item.product_id;
          const quantity = Number(item.quantity || 0);
          const unitPrice = Number(item.unit_price || 0);
          const itemDiscount = Number(item.discount_amount || 0);
          const itemTaxAmount = Number(item.tax_amount || 0);
          const isItemTaxInclusive = item.tax_inclusive ? true : false;

          if (!productId) throw new Error("Product is required for every sale item");
          if (quantity <= 0) throw new Error("Item quantity must be greater than 0");
          if (unitPrice < 0) throw new Error("Unit price cannot be negative");
          if (itemDiscount < 0) throw new Error("Item discount cannot be negative");
          if (itemTaxAmount < 0) throw new Error("Item tax cannot be negative");

          const grossLineTotal = unitPrice * quantity;
          if (itemDiscount > grossLineTotal) {
            throw new Error("Item discount cannot be greater than item total");
          }
          const grossAmountAfterItemDiscount = grossLineTotal - itemDiscount;
          const expectedItemTotal = isItemTaxInclusive
            ? grossAmountAfterItemDiscount
            : grossAmountAfterItemDiscount + itemTaxAmount;
          const incomingTotalPrice =
            item.total_price !== undefined ? Number(item.total_price) : expectedItemTotal;
          if (incomingTotalPrice < 0) throw new Error("Item total price cannot be negative");
          if (!eq2(incomingTotalPrice, expectedItemTotal)) {
            throw new Error("Invalid sale item total price");
          }

          const product = await Product.findById(productId).session(session);
          if (!product) throw new Error(`Product with ID ${productId} not found`);

          const batchId = item.batch_id || null;
          const costPrice = batchId
            ? await getItemCostPrice(productId, batchId, session)
            : Number(product.costPrice || 0);
          const revenueExcludingTax = isItemTaxInclusive
            ? grossAmountAfterItemDiscount - itemTaxAmount
            : grossAmountAfterItemDiscount;
          const itemCost = costPrice * quantity;
          const itemProfit = isCompleted ? revenueExcludingTax - itemCost : 0;

          preparedItems.push({
            productId,
            batchId: item.batch_id || null,
            productName: item.product_name?.trim() || product.productName,
            sku: item.sku ?? product.sku ?? null,
            quantity,
            unitPrice,
            discountAmount: itemDiscount,
            taxAmount: itemTaxAmount,
            taxInclusive: isItemTaxInclusive,
            totalPrice: incomingTotalPrice,
            costPrice,
            profitAmount: itemProfit,
          });
        }
        finalItems = preparedItems;
      } else {
        finalItems = oldItems.map((item) => {
          const quantity = Number(item.quantity || 0);
          const unitPrice = Number(item.unitPrice || 0);
          const itemDiscount = Number(item.discountAmount || 0);
          const itemTaxAmount = Number(item.taxAmount || 0);
          const isItemTaxInclusive = item.taxInclusive ? true : false;
          const costPrice = Number(item.costPrice || 0);
          const grossAmountAfterItemDiscount = unitPrice * quantity - itemDiscount;
          const revenueExcludingTax = isItemTaxInclusive
            ? grossAmountAfterItemDiscount - itemTaxAmount
            : grossAmountAfterItemDiscount;
          const itemCost = costPrice * quantity;
          const itemProfit = isCompleted ? revenueExcludingTax - itemCost : 0;
          return {
            ...item.toObject(),
            taxAmount: itemTaxAmount,
            taxInclusive: isItemTaxInclusive,
            profitAmount: itemProfit,
          };
        });
      }

      const computedSubtotal = finalItems.reduce(
        (sum, item) => sum + Number(item.unitPrice || 0) * Number(item.quantity || 0),
        0,
      );
      const computedTaxAmount = finalItems.reduce((sum, item) => sum + Number(item.taxAmount || 0), 0);
      const computedItemsTotal = finalItems.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0);

      const updatedSubtotal = subtotal !== undefined ? Number(subtotal) : computedSubtotal;
      const updatedTax = tax_amount !== undefined ? Number(tax_amount) : computedTaxAmount;

      if (updatedSubtotal < 0) throw new Error("Subtotal cannot be negative");
      if (updatedTax < 0) throw new Error("Tax cannot be negative");
      if (!eq2(updatedSubtotal, computedSubtotal)) {
        throw new Error("Subtotal must equal total item amount before item discount and tax");
      }
      if (!eq2(updatedTax, computedTaxAmount)) {
        throw new Error("Sale tax amount must equal total item tax amount");
      }

      const computedGrandTotal = computedItemsTotal - updatedDiscount;
      const updatedGrandTotal = body.grand_total !== undefined ? Number(body.grand_total) : computedGrandTotal;
      if (updatedGrandTotal < 0) throw new Error("Grand total cannot be negative");
      if (updatedDiscount > computedItemsTotal) {
        throw new Error("Discount cannot be greater than payable amount");
      }
      if (!eq2(updatedGrandTotal, computedGrandTotal)) {
        throw new Error("Grand total must equal item totals minus sale discount");
      }

      // Discount proration across items for profit recompute (mirrors original)
      const totalItemsForDiscountShare = finalItems.reduce(
        (sum, item) => sum + Number(item.totalPrice || 0),
        0,
      );
      finalItems = finalItems.map((item) => {
        const quantity = Number(item.quantity || 0);
        const unitPrice = Number(item.unitPrice || 0);
        const itemDiscount = Number(item.discountAmount || 0);
        const itemTaxAmount = Number(item.taxAmount || 0);
        const isItemTaxInclusive = item.taxInclusive ? true : false;
        const costPrice = Number(item.costPrice || 0);
        const grossAmountAfterItemDiscount = unitPrice * quantity - itemDiscount;
        const revenueExcludingTax = isItemTaxInclusive
          ? grossAmountAfterItemDiscount - itemTaxAmount
          : grossAmountAfterItemDiscount;
        const saleDiscountShare =
          totalItemsForDiscountShare > 0
            ? (Number(item.totalPrice || 0) / totalItemsForDiscountShare) * updatedDiscount
            : 0;
        const itemCost = costPrice * quantity;
        const itemProfit = isCompleted ? revenueExcludingTax - saleDiscountShare - itemCost : 0;
        return { ...item, profitAmount: itemProfit };
      });

      // Deduct stock for final items if completed (batch-aware)
      if (isCompleted) {
        for (const item of finalItems) {
          await decrementStock(item.productId, item.batchId || null, Number(item.quantity), session);
          await InventoryTransaction.create(
            [
              {
                productId: item.productId,
                batchId: item.batchId || null,
                type: "OUT",
                quantity: Number(item.quantity),
                referenceType: "SALE",
                referenceId: sale._id,
              },
            ],
            { session },
          );
        }
      }

      const validPayments = hasPayments
        ? payments
            .map((p) => ({
              paymentMethodId: p.payment_method_id,
              amount: Number(p.amount || 0),
            }))
            .filter((p) => p.amount > 0)
        : sale.payments;

      let updatedPaidAmount = Number(sale.paidAmount || 0);
      if (hasPayments) {
        updatedPaidAmount = validPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
      }

      const updatedChangeAmount = updatedPaidAmount > updatedGrandTotal ? updatedPaidAmount - updatedGrandTotal : 0;
      const updatedRemainingAmount = updatedPaidAmount < updatedGrandTotal ? updatedGrandTotal - updatedPaidAmount : 0;

      let updatedPaymentStatusFinal;
      if (updatedSaleStatus === "Cancelled") {
        updatedPaymentStatusFinal = "Cancelled";
      } else if (updatedSaleStatus === "Returned") {
        updatedPaymentStatusFinal = "Refunded";
      } else {
        updatedPaymentStatusFinal =
          body.payment_status ??
          (updatedRemainingAmount === 0 ? "Paid" : updatedPaidAmount > 0 ? "Partial" : "Unpaid");
      }

      let snapshotName = customer_name !== undefined ? customer_name?.trim() || null : sale.customerName;
      let snapshotPhone = customer_phone !== undefined ? customer_phone?.trim() || null : sale.customerPhone;

      if (updatedCustomerId) {
        const customer = await Customer.findById(updatedCustomerId).session(session);
        if (!customer) throw new Error(`Customer with ID ${updatedCustomerId} not found`);

        const sameCustomer =
          wasCompleted && sale.customerId && String(sale.customerId) === String(updatedCustomerId);
        const oldRemaining = sameCustomer ? Number(sale.remainingAmount || 0) : 0;
        const oldChange = sameCustomer ? Number(sale.changeAmount || 0) : 0;
        const correctedCurrentCredit = Math.max(
          Number(customer.creditAmount || 0) - oldRemaining + oldChange,
          0,
        );

        if (
          isCompleted &&
          updatedRemainingAmount > 0 &&
          correctedCurrentCredit + updatedRemainingAmount > Number(customer.creditLimit || 0)
        ) {
          throw new Error("Customer does not have enough credit");
        }
        snapshotName = snapshotName || customer.name;
        snapshotPhone = snapshotPhone || customer.phone;
      }

      if (wasCompleted && sale.customerId) {
        const oldCustomer = await Customer.findById(sale.customerId).session(session);
        if (oldCustomer) {
          oldCustomer.creditAmount = Math.max(
            Number(oldCustomer.creditAmount || 0) -
              Number(sale.remainingAmount || 0) +
              Number(sale.changeAmount || 0),
            0,
          );
          await oldCustomer.save({ session });
        }
      }

      if (isCompleted && updatedCustomerId && (updatedRemainingAmount > 0 || updatedChangeAmount > 0)) {
        const newCustomer = await Customer.findById(updatedCustomerId).session(session);
        newCustomer.creditAmount = Math.max(
          Number(newCustomer.creditAmount || 0) + updatedRemainingAmount - updatedChangeAmount,
          0,
        );
        await newCustomer.save({ session });
      }

      const updatedProfitAmount = isCompleted
        ? finalItems.reduce((sum, item) => sum + Number(item.profitAmount || 0), 0)
        : 0;
      const hasInclusiveTaxItem = finalItems.some((item) => Boolean(item.taxInclusive));

      const oldPayments = sale.payments;
      const isReturningOrCancelling = wasCompleted && ["Returned", "Cancelled"].includes(updatedSaleStatus);

      if (isReturningOrCancelling) {
        for (const oldPayment of oldPayments) {
          await PaymentMethodTransaction.create(
            [
              {
                paymentMethodId: oldPayment.paymentMethodId,
                transactionType: "ADJUSTMENT_OUT",
                direction: "OUT",
                amount: Number(oldPayment.amount),
                referenceType: "sale_payment",
                referenceId: sale._id,
                title: `${updatedSaleStatus} Sale #${id}`,
                notes: notes !== undefined ? notes?.trim() || null : sale.notes,
              },
            ],
            { session },
          );
        }
      }

      let finalPayments = sale.payments;
      if (hasPayments) {
        if (wasCompleted && !isReturningOrCancelling) {
          for (const oldPayment of oldPayments) {
            await PaymentMethodTransaction.create(
              [
                {
                  paymentMethodId: oldPayment.paymentMethodId,
                  transactionType: "ADJUSTMENT_OUT",
                  direction: "OUT",
                  amount: Number(oldPayment.amount),
                  referenceType: "sale_payment",
                  referenceId: sale._id,
                  title: `Sale Payment Updated #${id}`,
                  notes: "Reversed old sale payment before update",
                },
              ],
              { session },
            );
          }
        }

        for (const payment of validPayments) {
          if (!payment.paymentMethodId) throw new Error("Payment method is required");
          const paymentMethod = await PaymentMethod.findById(payment.paymentMethodId).session(session);
          if (!paymentMethod) {
            throw new Error(`Payment method with ID ${payment.paymentMethodId} not found`);
          }
          if (isCompleted && !isReturningOrCancelling) {
            await PaymentMethodTransaction.create(
              [
                {
                  paymentMethodId: payment.paymentMethodId,
                  transactionType: "ADJUSTMENT_IN",
                  direction: "IN",
                  amount: Number(payment.amount),
                  referenceType: "sale_payment",
                  referenceId: sale._id,
                  title: `Updated Sale Payment #${id}`,
                  notes: "Added updated sale payment after update",
                },
              ],
              { session },
            );
          }
        }
        finalPayments = validPayments.map((p) => ({
          paymentMethodId: p.paymentMethodId,
          amount: p.amount,
          createdAt: new Date(),
        }));
      }

      sale.customerId = updatedCustomerId || null;
      sale.customerName = snapshotName;
      sale.customerPhone = snapshotPhone;
      sale.subtotal = updatedSubtotal;
      sale.discountAmount = updatedDiscount;
      sale.taxAmount = updatedTax;
      sale.isTaxInclusive = hasInclusiveTaxItem || Boolean(body.is_tax_inclusive);
      sale.grandTotal = updatedGrandTotal;
      sale.paidAmount = updatedPaidAmount;
      sale.changeAmount = updatedChangeAmount;
      sale.remainingAmount = updatedRemainingAmount;
      sale.profitAmount = updatedProfitAmount;
      sale.paymentStatus = updatedPaymentStatusFinal;
      sale.saleStatus = updatedSaleStatus;
      sale.notes = notes !== undefined ? notes?.trim() || null : sale.notes;
      sale.items = finalItems;
      sale.payments = finalPayments;

      await sale.save({ session });
      resultDoc = sale;
    });
    await resultDoc.populate(PAYMENT_METHOD_POPULATE);
    return serializeSale(resultDoc);
  } finally {
    session.endSession();
  }
}

export async function deleteSale(id) {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const sale = await Sale.findById(id).session(session);
      if (!sale) {
        const err = new Error("Sale not found");
        err.statusCode = 404;
        throw err;
      }

      if (sale.saleStatus === "Completed") {
        for (const item of sale.items) {
          if (item.batchId) {
            await ProductBatch.updateOne(
              { _id: item.batchId },
              { $inc: { quantity: Number(item.quantity) } },
              { session },
            );
          } else {
            await Product.updateOne(
              { _id: item.productId },
              { $inc: { "stock.currentStock": Number(item.quantity) } },
              { session },
            );
          }
          await InventoryTransaction.create(
            [
              {
                productId: item.productId,
                batchId: item.batchId || null,
                type: "IN",
                quantity: Number(item.quantity),
                referenceType: "SALE_DELETE",
                referenceId: sale._id,
              },
            ],
            { session },
          );
        }

        for (const payment of sale.payments) {
          await PaymentMethodTransaction.create(
            [
              {
                paymentMethodId: payment.paymentMethodId,
                transactionType: "ADJUSTMENT_OUT",
                direction: "OUT",
                amount: Number(payment.amount),
                referenceType: "sale",
                referenceId: sale._id,
                title: `Deleted Sale #${sale._id}`,
                notes: "Sale deleted, payment reversed",
              },
            ],
            { session },
          );
        }

        if (sale.customerId) {
          const customer = await Customer.findById(sale.customerId).session(session);
          if (customer) {
            customer.creditAmount = Math.max(
              Number(customer.creditAmount || 0) -
                Number(sale.remainingAmount || 0) +
                Number(sale.changeAmount || 0),
              0,
            );
            await customer.save({ session });
          }
        }
      }

      await Sale.deleteOne({ _id: id }, { session });
    });
  } finally {
    session.endSession();
  }
}
