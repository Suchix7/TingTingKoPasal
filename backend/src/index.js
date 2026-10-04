import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const app = (await import("./app.js")).default;
const { connectMongo } = await import("./config/mongo.js");

await connectMongo();

app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Backend running",
  });
});

const port = process.env.PORT || 5000;

const server = app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

server.on("error", (error) => {
  console.error("Server failed to start:", error);
});
