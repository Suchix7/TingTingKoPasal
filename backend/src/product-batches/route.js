import express from "express";

import {
  createProductBatch,
  updateProductBatch,
  deleteProductBatch,
  getProductBatches,
  getProductBatchesByProductId,
  getProductBatchById,
} from "./controller.js";

const router = express.Router();

router.post("/", createProductBatch);

router.get("/", getProductBatches);

router.get("/product/:productId", getProductBatchesByProductId);

router.get("/:id", getProductBatchById);

router.put("/:id", updateProductBatch);

router.delete("/:id", deleteProductBatch);

export default router;
