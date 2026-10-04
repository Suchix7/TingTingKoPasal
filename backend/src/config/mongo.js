import mongoose from "mongoose";

export async function connectMongo() {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    console.error("MONGO_URI not set — cannot start without a database.");
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);
    console.log("Connected to MongoDB:", mongoose.connection.name);
    return mongoose.connection;
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
}

export default mongoose;
