import express from "express";
import session from "express-session";
import MongoStore from "connect-mongo";
import cors from "cors";
import authRouter from "./auth/route.js";
import { requireAuth } from "./auth/middleware.js";
import productRouter from "./product/route.js";
import paymentMethodRouter from "./payment-methods/route.js";
import categoryRouter from "./categories/route.js";
import saleRouter from "./sales/route.js";
import customerRouter from "./customers/route.js";
import inventoryRouter from "./inventory/route.js";
import inventoryCostRouter from "./inventory-cost/route.js";
import purchaseOrdersRouter from "./purchase-orders/route.js";
import suppliersRouter from "./suppliers/route.js";
import eoqRouter from "./eoq/route.js";
import inventoryTransactionsRouter from "./inventory-transactions/route.js";
import expenseRouter from "./expenses/route.js";
import daybookRouter from "./daybook/route.js";
import analyticsRouter from "./analytics/route.js";
import dashboardRouter from "./dashboard/route.js";
import securityRouter from "./security/route.js";
import salesForecastRouter from "./sales-forecast/route.js";
import paymentMethodTransactionsRouter from "./payment-method-transactions/route.js";
import fpGrowthRouter from "./fp-growth/route.js";
import quickSalesRouter from "./quick-sales/route.js";
import abcRouter from "./abc/route.js";
import productBatchRouter from "./product-batches/route.js";
import singleABCRouter from "./single-abc/route.js";
import storeRouter from "./store-info/route.js";
import activityLogRouter from "./activity-log/route.js";

const isProd = process.env.NODE_ENV === "production";

const app = express();

if (isProd) {
  app.set("trust proxy", 1);
}

const allowedOrigins = [
  // FRONTEND_URL may hold several comma-separated origins
  ...(process.env.FRONTEND_URL || "")
    .split(",")
    .map((url) => url.trim().replace(/\/+$/, "")),
  ...(isProd ? [] : ["http://localhost:3000", "http://localhost:5000"]),
].filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  }),
);

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: process.env.MONGO_URI
      ? MongoStore.create({ mongoUrl: process.env.MONGO_URI })
      : undefined,
    cookie: {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
    },
  }),
);
app.use(express.json());

app.use("/api/v1", authRouter);
app.use("/api/v1", requireAuth);

app.use("/api/v1/products", productRouter);
app.use("/api/v1/payment-methods", paymentMethodRouter);
app.use("/api/v1/categories", categoryRouter);
app.use("/api/v1/sales", saleRouter);
app.use("/api/v1/customers", customerRouter);
app.use("/api/v1/inventory", inventoryRouter);
app.use("/api/v1/inventory-costs", inventoryCostRouter);
app.use("/api/v1/purchase-orders", purchaseOrdersRouter);
app.use("/api/v1/suppliers", suppliersRouter);
app.use("/api/v1/eoq", eoqRouter);
app.use("/api/v1/inventory-transactions", inventoryTransactionsRouter);
app.use("/api/v1/expenses", expenseRouter);
app.use("/api/v1/daybook", daybookRouter);
app.use("/api/v1/analytics", analyticsRouter);
app.use("/api/v1/dashboard", dashboardRouter);
app.use("/api/v1/security", securityRouter);
app.use("/api/v1/forecast", salesForecastRouter);
app.use("/api/v1/payment-transactions", paymentMethodTransactionsRouter);
app.use("/api/v1/fp-growth", fpGrowthRouter);
app.use("/api/v1/quick-sales", quickSalesRouter);
app.use("/api/v1/abc", abcRouter);
app.use("/api/v1/product-batches", productBatchRouter);
app.use("/api/v1/single-abc", singleABCRouter);
app.use("/api/v1/store-info", storeRouter);
app.use("/api/v1/activity-logs", activityLogRouter);

export default app;
