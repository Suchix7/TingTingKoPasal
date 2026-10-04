import express from "express";
import {
  createInventoryCost,
  getAllInventoryCosts,
  getInventoryCostByProductId,
  updateInventoryCost,
  deleteInventoryCost,
} from "./controller.js";

const router = express.Router();

router.post("/", createInventoryCost);
router.get("/", getAllInventoryCosts);
router.get("/:product_id", getInventoryCostByProductId);
router.put("/:product_id", updateInventoryCost);
router.delete("/:product_id", deleteInventoryCost);

export default router;
