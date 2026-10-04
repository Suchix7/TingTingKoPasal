import express from "express";
import { getFPGrowthAnalysis } from "./controller.js";

const router = express.Router();

router.get("/", getFPGrowthAnalysis);

export default router;
