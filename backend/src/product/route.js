import express from "express";
import {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getProductByBarcode,
  saveProductPhotos,
  signProductMediaUpload,
  reprintBarcode,
  regenerateBarcode,
  markBarcodePrinted,
  getNameMap,
  getProductModels,
} from "./controller.js";

const router = express.Router();

router.post("/", createProduct);

router.get("/", getProducts);

router.get("/name-map", getNameMap);

router.get("/models", getProductModels);

router.get("/:id", getProductById);

router.get("/barcode/:barcode", getProductByBarcode);

router.put("/:id", updateProduct);

router.delete("/:id", deleteProduct);

// Signed params for uploading a photo or video straight to Cloudinary
router.post("/media/sign", signProductMediaUpload);

// Replace the photo/video list in one go (first entry is the cover)
router.put("/:id/photos", saveProductPhotos);

router.post("/:id/barcode/reprint", reprintBarcode);

router.post("/:id/barcode/regenerate", regenerateBarcode);

router.post("/:id/barcode/mark-printed", markBarcodePrinted);

export default router;
