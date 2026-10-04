import express from "express";
import { calculateABCClassification } from "./controller.js";

const router = express.Router();

router.get("/", calculateABCClassification);

export default router;
