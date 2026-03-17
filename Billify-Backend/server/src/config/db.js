import mongoose from "mongoose";
import { env } from "./env.js";

export async function connectDb() {
  mongoose.set("strictQuery", true);
  await mongoose.connect(env.mongoUri, {
    autoIndex: true,
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000
  });
  return mongoose.connection;
}
