import express from "express";
import {
  checkController,
  loginController,
  logoutController,
  sessionController,
} from "./controller.js";
import { requireAuth } from "./middleware.js";

const router = express.Router();

router.post("/login", loginController);

router.post("/logout", logoutController);

router.get("/check", requireAuth, checkController);

// public: who is signed in (if anyone), for the customer site
router.get("/session", sessionController);

export default router;
