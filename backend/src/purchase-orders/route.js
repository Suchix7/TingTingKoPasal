import express from "express";
import {
  createPurchaseOrder,
  getAllPurchaseOrders,
  getPurchaseOrderById,
  updatePurchaseOrderStatus,
  deletePurchaseOrder,
} from "./controller.js";

const router = express.Router();

router.post("/", createPurchaseOrder);
router.get("/", getAllPurchaseOrders);
router.get("/:id", getPurchaseOrderById);
router.patch("/:id/status", updatePurchaseOrderStatus);
router.delete("/:id", deletePurchaseOrder);

export default router;
