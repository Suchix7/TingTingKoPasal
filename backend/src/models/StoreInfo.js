import mongoose from "mongoose";

const storeInfoSchema = new mongoose.Schema(
  {
    storeName: { type: String, default: "" },
    address: { type: String, default: "" },
    phone: { type: String, default: "" },
    panVatNumber: { type: String, default: "" },
  },
  { timestamps: true },
);

export default mongoose.model("StoreInfo", storeInfoSchema);
