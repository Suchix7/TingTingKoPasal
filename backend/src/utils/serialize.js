export function serializeProduct(doc) {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : doc;

  return {
    id: String(obj._id),
    product_name: obj.productName,
    sku: obj.sku,
    category_id: obj.categoryId ? String(obj.categoryId) : null,
    cost_price: obj.costPrice,
    sale_price: obj.salePrice,
    unit: obj.unit,
    status: obj.status,
    barcode: obj.barcode || null,
    previous_barcodes: obj.previousBarcodes || [],
    barcode_last_printed_at: obj.barcodeLabel?.lastPrintedAt || null,
    barcode_last_printed_quantity: obj.barcodeLabel?.lastPrintedQuantity || 0,
    description: obj.description || null,
    photo_url: obj.photoUrl || null,
    stock_quantity: obj.stock?.currentStock || 0,
    reorder_level: obj.stock?.reorderLevel || 0,
    reorder_quantity: obj.stock?.reorderQuantity || 0,
    last_restocked_at: obj.stock?.lastRestockedAt || null,
    holding_cost_per_unit: obj.costs?.holdingCostPerUnit || 0,
    storage_cost: obj.costs?.storageCost || 0,
    insurance_cost: obj.costs?.insuranceCost || 0,
    spoilage_rate: obj.costs?.spoilageRate || 0,
    is_deleted: !!obj.isDeleted,
    deleted_at: obj.deletedAt || null,
    created_at: obj.createdAt,
    updated_at: obj.updatedAt,
  };
}

export function serializeBatch(doc, extra = {}) {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : doc;

  return {
    id: String(obj._id),
    product_id: String(obj.productId),
    batch_number: obj.batchNumber,
    barcode: obj.barcode || null,
    quantity: obj.quantity,
    cost_price: obj.costPrice,
    sale_price: obj.salePrice,
    is_deleted: !!obj.isDeleted,
    deleted_at: obj.deletedAt || null,
    created_at: obj.createdAt,
    updated_at: obj.updatedAt,
    ...extra,
  };
}

export function serializeInventoryTransaction(doc, extra = {}) {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : doc;

  return {
    id: String(obj._id),
    product_id: obj.productId ? String(obj.productId) : null,
    batch_id: obj.batchId ? String(obj.batchId) : null,
    transaction_type: obj.type,
    type: obj.type,
    quantity: obj.quantity,
    reference_type: obj.referenceType,
    reference_id: obj.referenceId ? String(obj.referenceId) : null,
    created_at: obj.createdAt,
    ...extra,
  };
}
