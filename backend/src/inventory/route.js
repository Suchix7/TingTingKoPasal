import {
  updateInventory,
  restockInventory,
  getAllInventory,
  getInventoryByProductId,
  deductInventory,
  updateProductBatch,
  restockProductBatch,
  deductProductBatch,
} from "./controller.js";
import express from "express";

const router = express.Router();

router.put("/:id", updateInventory);
router.post("/restock", restockInventory);
router.get("/", getAllInventory);
router.get("/:id", getInventoryByProductId);
router.post("/deduct", deductInventory);
router.put("/batch/:id", updateProductBatch);
router.post("/batch/restock/:id", restockProductBatch);
router.post("/batch/deduct/:id", deductProductBatch);

export default router;
