import express from "express";
import { updatePasscode } from "./controller.js";

const router = express.Router();

router.put("/", updatePasscode);

export default router;
