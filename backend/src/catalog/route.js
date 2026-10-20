import express from "express";
import { getCovers, getCover, getModels, getCategories, getStore } from "./controller.js";

const router = express.Router();

router.get("/covers", getCovers);
router.get("/covers/:id", getCover);
router.get("/models", getModels);
router.get("/categories", getCategories);
router.get("/store", getStore);

export default router;
