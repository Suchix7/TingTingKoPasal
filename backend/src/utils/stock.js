import ProductBatch from "../models/ProductBatch.js";

// A product's real stock = its own (standard) stock + everything held on its
// batches / phone models. Reports must use this, otherwise a product whose
// stock lives entirely on phone models would always look "out of stock".

// For aggregations on the products collection: adds batchStock, batchValue
// (at batch cost) and totalStock to every product.
export const totalStockStages = [
  {
    $lookup: {
      from: "productbatches",
      let: { pid: "$_id" },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ["$productId", "$$pid"] },
                { $ne: ["$isDeleted", true] },
              ],
            },
          },
        },
      ],
      as: "batches",
    },
  },
  {
    $addFields: {
      batchStock: { $sum: "$batches.quantity" },
      batchValue: {
        $sum: {
          $map: {
            input: "$batches",
            as: "b",
            in: { $multiply: ["$$b.quantity", "$$b.costPrice"] },
          },
        },
      },
    },
  },
  {
    $addFields: {
      totalStock: { $add: [{ $ifNull: ["$stock.currentStock", 0] }, "$batchStock"] },
    },
  },
];

// For code that already loaded products: Map(productId -> units held on batches)
export async function getBatchStockMap(productIds) {
  if (!productIds.length) return new Map();

  const rows = await ProductBatch.aggregate([
    { $match: { productId: { $in: productIds }, isDeleted: { $ne: true } } },
    { $group: { _id: "$productId", quantity: { $sum: "$quantity" } } },
  ]);

  return new Map(rows.map((r) => [String(r._id), Number(r.quantity || 0)]));
}
