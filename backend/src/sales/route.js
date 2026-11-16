import express from "express";
import multer from "multer";
import {
  createSale,
  getSales,
  getSaleById,
  updateSale,
  deleteSale,
  revokeSale,
  completeCodSale,
  getPendingCodSales,
  getSaleItems,
  getSaleItemById,
  getSalePayments,
  getSalePaymentById,
  getSalePaymentsBySaleId,
  uploadPaymentProof,
} from "./controller.js";
import { requireAuth } from "../auth/middleware.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

const router = express.Router();

router.post("/", createSale);

router.get("/", getSales);

// Cash on Delivery orders waiting for payment (before "/:id")
router.get("/cod/pending", getPendingCodSales);

router.get("/:id", getSaleById);

router.post("/:id/complete-cod", completeCodSale);

router.put("/:id", updateSale);

router.delete("/:id", deleteSale);

router.post("/:id/revoke", revokeSale);

router.post("/:id/payment-proof", upload.single("photo"), uploadPaymentProof);

router.get("/items/all", getSaleItems);

router.get("/items/:id", getSaleItemById);

router.get("/test/sale-payments", getSalePayments);

router.get("/sale-payments/by-sale", getSalePaymentsBySaleId);

router.get("/sale-payments/:id", getSalePaymentById);

export default router;
