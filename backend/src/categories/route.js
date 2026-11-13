import express from "express";
import multer from "multer";
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  uploadCategoryThumbnail,
  removeCategoryThumbnail,
  getCategoryOrder,
  saveCategoryOrder,
} from "./controller.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

const router = express.Router();

router.get("/", getCategories);
// the order categories show on the customer shop (before "/:id")
router.get("/order", getCategoryOrder);
router.put("/order", saveCategoryOrder);
router.post("/", createCategory);
router.put("/:id", updateCategory);
router.delete("/:id", deleteCategory);
router.post("/:id/thumbnail", upload.single("thumbnail"), uploadCategoryThumbnail);
router.delete("/:id/thumbnail", removeCategoryThumbnail);

export default router;
