import express from "express";
import { getDaybookByDate } from "./controller.js";

const router = express.Router();

router.get("/", getDaybookByDate);

export default router;
