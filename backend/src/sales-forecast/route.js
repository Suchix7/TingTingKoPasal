import express from "express";
import { getSalesForecast } from "./controller.js";

const router = express.Router();

router.get("/sales", getSalesForecast);

export default router;
