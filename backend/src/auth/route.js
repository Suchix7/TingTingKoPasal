import express from "express";
import {
  checkController,
  loginController,
  logoutController,
} from "./controller.js";
import { requireAuth } from "./middleware.js";

const router = express.Router();

router.post("/login", loginController);

router.post("/logout", logoutController);

router.get("/check", requireAuth, checkController);

export default router;
