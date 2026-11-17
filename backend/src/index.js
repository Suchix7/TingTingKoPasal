import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "..", ".env") });

// Leave a reason in the logs whenever the process dies or is told to stop,
// so a restart on Render is never a mystery.
process.on("uncaughtException", (error) => {
  console.error("Uncaught exception, shutting down:", error);
  process.exit(1);
});
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection, shutting down:", reason);
  process.exit(1);
});

const app = (await import("./app.js")).default;
const { default: mongoose, connectMongo } = await import("./config/mongo.js");
const { seedDefaultPaymentMethods } = await import(
  "./config/seedPaymentMethods.js"
);
const { seedPriceViewer } = await import("./config/seedPriceViewer.js");

app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Backend running",
  });
});

const port = process.env.PORT || 5000;

// Open the port first: Render answers 503 until something listens, so after
// every restart /health has to come back at once. Requests that reach the
// database meanwhile wait for the connection (mongoose buffers them).
const server = app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

server.on("error", (error) => {
  console.error("Server failed to start:", error);
  process.exit(1);
});

for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => {
    console.log(`${signal} received, shutting down`);
    server.close(async () => {
      await mongoose.connection.close().catch(() => {});
      process.exit(0);
    });
    // don't hang forever on a stuck connection
    setTimeout(() => process.exit(0), 10000).unref();
  });
}

await connectMongo();
await seedDefaultPaymentMethods();
await seedPriceViewer();
