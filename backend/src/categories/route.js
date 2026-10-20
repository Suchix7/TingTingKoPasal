import express from "express";
import multer from "multer";
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  uploadCategoryThumbnail,
  removeCategoryThumbnail,
} from "./controller.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

const router = express.Router();

router.get("/", getCategories);
router.post("/", createCategory);
router.put("/:id", updateCategory);
router.delete("/:id", deleteCategory);
router.post("/:id/thumbnail", upload.single("thumbnail"), uploadCategoryThumbnail);
router.delete("/:id/thumbnail", removeCategoryThumbnail);

export default router;
