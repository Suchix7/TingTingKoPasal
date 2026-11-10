import mongoose from "mongoose";

const systemCredentialsSchema = new mongoose.Schema(
  {
    // shared by every admin username
    passcodeHash: { type: String, required: true },
    // the price-viewer account (customer site with selling prices)
    priceViewerPasscodeHash: { type: String, default: null },
  },
  { timestamps: true },
);

export default mongoose.model("SystemCredentials", systemCredentialsSchema);
