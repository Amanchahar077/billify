import app from "./app.js";
import { connectDb } from "./config/db.js";
import { env } from "./config/env.js";

const start = async () => {
  try {
    console.log("Connecting to MongoDB...");
    await connectDb();
    console.log("MongoDB connected");
    app.listen(env.port, () => {
      console.log(`Billify API running on port ${env.port}`);
    });
  } catch (err) {
    console.error("Failed to start server", err);
    process.exit(1);
  }
};

start();
