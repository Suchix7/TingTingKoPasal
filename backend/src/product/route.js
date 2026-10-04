import express from "express";
import multer from "multer";
import {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getProductByBarcode,
  uploadProductPhoto,
  reprintBarcode,
  regenerateBarcode,
  markBarcodePrinted,
} from "./controller.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

const router = express.Router();

router.post("/", createProduct);

router.get("/", getProducts);

router.get("/:id", getProductById);

router.get("/barcode/:barcode", getProductByBarcode);

router.put("/:id", updateProduct);

router.delete("/:id", deleteProduct);

router.post("/:id/photo", upload.single("photo"), uploadProductPhoto);

router.post("/:id/barcode/reprint", reprintBarcode);

router.post("/:id/barcode/regenerate", regenerateBarcode);

router.post("/:id/barcode/mark-printed", markBarcodePrinted);

export default router;
