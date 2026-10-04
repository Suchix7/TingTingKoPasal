import express from "express";
import {
  calculateEOQByProductId,
  calculateEOQForAllProducts,
} from "./controller.js";

const router = express.Router();

router.get("/", calculateEOQForAllProducts);
router.get("/:product_id", calculateEOQByProductId);

export default router;
