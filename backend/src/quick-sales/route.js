import express from "express";

import {
  createQuickSale,
  getQuickSales,
  getQuickSaleById,
  updateQuickSale,
  cancelQuickSale,
  markQuickSaleAsConverted,
  deleteQuickSale,
} from "./controller.js";

const router = express.Router();

router.post("/", createQuickSale);

router.get("/", getQuickSales);

router.get("/:id", getQuickSaleById);

router.put("/:id", updateQuickSale);

router.patch("/:id/cancel", cancelQuickSale);

router.patch("/:id/convert", markQuickSaleAsConverted);

router.delete("/:id", deleteQuickSale);

export default router;
