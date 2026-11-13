import mongoose from "mongoose";

const storeInfoSchema = new mongoose.Schema(
  {
    storeName: { type: String, default: "" },
    address: { type: String, default: "" },
    phone: { type: String, default: "" },
    // Google Maps link opened when a customer taps the location
    mapUrl: { type: String, default: "" },
    // Instagram username for the "message us" button on the shop ("" hides it)
    instagram: { type: String, default: "tingtingkopasal" },
    panVatNumber: { type: String, default: "" },
  },
  { timestamps: true },
);

export default mongoose.model("StoreInfo", storeInfoSchema);
