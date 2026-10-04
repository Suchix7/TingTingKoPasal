import express from "express";
import { calculateTraditionalABCClassification } from "./controller.js";

const router = express.Router();

router.get("/", calculateTraditionalABCClassification);

export default router;
