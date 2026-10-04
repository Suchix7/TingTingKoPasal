import express from "express";
import { getPaymentTransactions } from "./controller.js";

const router = express.Router();

router.get("/", getPaymentTransactions);

export default router;
