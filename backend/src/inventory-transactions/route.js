import express from "express";
import {
  getAllInventoryTransactions,
  getInventoryTransactionById,
  getInventoryTransactionsByProductId,
  getInventoryTransactionSummary,
} from "./controller.js";

const router = express.Router();

router.get("/", getAllInventoryTransactions);
router.get("/summary", getInventoryTransactionSummary);
router.get("/product/:product_id", getInventoryTransactionsByProductId);
router.get("/:id", getInventoryTransactionById);

export default router;
