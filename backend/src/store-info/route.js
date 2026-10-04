import express from "express";

import {
  createStore,
  getStore,
  updateStore,
  deleteStore,
} from "./controller.js";

const storeRouter = express.Router();

storeRouter.post("/", createStore);
storeRouter.get("/", getStore);
storeRouter.put("/", updateStore);
storeRouter.delete("/", deleteStore);

export default storeRouter;
