import express from "express";
import { getAnalyticsOverview } from "./controller.js";

const router = express.Router();

router.get("/overview", getAnalyticsOverview);

export default router;
