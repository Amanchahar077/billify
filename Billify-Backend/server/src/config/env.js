import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: process.env.PORT || 5000,
  mongoUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/billify",
  accessSecret: process.env.JWT_ACCESS_SECRET || "billify_access_dev",
  refreshSecret: process.env.JWT_REFRESH_SECRET || "billify_refresh_dev",
  accessExpires: process.env.JWT_ACCESS_EXPIRES || "15m",
  refreshExpires: process.env.JWT_REFRESH_EXPIRES || "7d",
  corsOrigin: process.env.CORS_ORIGIN || "http://127.0.0.1:5173"
};
