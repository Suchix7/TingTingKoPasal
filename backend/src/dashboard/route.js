import express from "express";
import { getDashboardOverview } from "./controller.js";

const router = express.Router();

router.get("/overview", getDashboardOverview);

export default router;
