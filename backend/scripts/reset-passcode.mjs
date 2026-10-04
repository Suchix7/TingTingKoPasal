// Usage: node scripts/reset-passcode.mjs <new-passcode>
import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

dotenv.config();

const passcode = process.argv[2];
if (!passcode || passcode.trim().length === 0) {
  console.error("Usage: node scripts/reset-passcode.mjs <new-passcode>");
  process.exit(1);
}

await mongoose.connect(process.env.MONGO_URI);
const passcodeHash = await bcrypt.hash(String(passcode), 10);
const result = await mongoose.connection.db
  .collection("systemcredentials")
  .updateOne(
    {},
    { $set: { passcodeHash, updatedAt: new Date() } },
    { upsert: true },
  );
console.log(
  result.upsertedCount ? "Passcode created." : "Passcode updated.",
  "DB:",
  mongoose.connection.db.databaseName,
);
await mongoose.disconnect();
