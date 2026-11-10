// Usage: node scripts/set-price-password.mjs <new-password>
// Sets the password of the price-viewer account (customer site with prices).
import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

dotenv.config();

const password = process.argv[2];
if (!password || password.trim().length < 4) {
  console.error("Usage: node scripts/set-price-password.mjs <new-password> (4+ characters)");
  process.exit(1);
}

await mongoose.connect(process.env.MONGO_URI);
const priceViewerPasscodeHash = await bcrypt.hash(String(password), 10);
const result = await mongoose.connection.db
  .collection("systemcredentials")
  .updateOne({}, { $set: { priceViewerPasscodeHash, updatedAt: new Date() } });
console.log(
  result.matchedCount ? "Price viewer password updated." : "No credentials found: set the admin passcode first.",
  "DB:",
  mongoose.connection.db.databaseName,
);
await mongoose.disconnect();
