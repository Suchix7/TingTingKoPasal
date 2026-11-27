import express from "express";
import {
  createCustomer,
  getCustomers,
  getCustomerById,
  getCustomerSales,
  updateCustomer,
  deleteCustomer,
} from "./controller.js";

const router = express.Router();

router.post("/", createCustomer);
router.get("/", getCustomers);
router.get("/:id", getCustomerById);
router.get("/:id/sales", getCustomerSales);
router.put("/:id", updateCustomer);
router.delete("/:id", deleteCustomer);

export default router;
