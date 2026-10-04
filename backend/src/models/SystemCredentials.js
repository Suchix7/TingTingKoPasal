import mongoose from "mongoose";

const systemCredentialsSchema = new mongoose.Schema(
  {
    passcodeHash: { type: String, required: true },
  },
  { timestamps: true },
);

export default mongoose.model("SystemCredentials", systemCredentialsSchema);
