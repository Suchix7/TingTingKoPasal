import express from "express";
import {
  createPaymentMethod,
  deletePaymentMethod,
  getPaymentMethods,
  updatePaymentMethod,
  addPaymentMethodFunds,
  withdrawPaymentMethodFunds,
  transferPaymentMethodFunds,
} from "./controller.js";

const router = express.Router();

router.post("/", createPaymentMethod);

router.get("/", getPaymentMethods);

router.put("/:id", updatePaymentMethod);

router.delete("/:id", deletePaymentMethod);

router.post("/:id/add-funds", addPaymentMethodFunds);

router.post("/:id/withdraw", withdrawPaymentMethodFunds);

router.post("/transfer", transferPaymentMethodFunds);

export default router;
