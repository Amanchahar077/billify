import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import { env } from "./config/env.js";

import authRoutes from "./routes/authRoutes.js";
import customerRoutes from "./routes/customerRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import invoiceRoutes from "./routes/invoiceRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import { ApiError } from "./utils/ApiError.js";

const app = express();

const configuredOrigins = env.corsOrigin
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins = new Set([
  ...configuredOrigins,
  "http://localhost:5173",
  "https://billify-g8tw.vercel.app/"
]);

function isLocalhostOrigin(origin) {
  try {
    const url = new URL(origin);
    return url.hostname === "localhost" || url.hostname === "https://billify-g8tw.vercel.app/";
  } catch {
    return false;
  }
}

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.has("*")) return callback(null, true);
      if (allowedOrigins.has(origin)) return callback(null, true);
      if (isLocalhostOrigin(origin)) return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true
  })
);

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan("dev"));

app.get("/api/health", (req, res) => {
  res.status(200).json({ success: true, message: "Billify API is online" });
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/customers", customerRoutes);
app.use("/api/v1/products", productRoutes);
app.use("/api/v1/invoices", invoiceRoutes);
app.use("/api/v1/reports", reportRoutes);

app.use("*", (req, res, next) => {
  next(new ApiError(404, `Route ${req.originalUrl} not found`));
});

app.use((err, req, res, next) => {
  let status = err.statusCode || err.status || 500;
  let message = err.message || "Server error";

  if (err.type === "entity.parse.failed") {
    status = 400;
    message = "Invalid JSON body";
  } else if (err.message === "Not allowed by CORS") {
    status = 403;
    message = "Origin not allowed by CORS";
  } else if (err.name === "CastError" && err.kind === "ObjectId") {
    status = 400;
    message = "Invalid id";
  } else if (err.name === "ValidationError") {
    status = 400;
    message = Object.values(err.errors).map((error) => error.message).join(", ");
  } else if (err.code === 11000) {
    status = 409;
    message = "Duplicate key";
  }

  res.status(status).json({
    success: false,
    message
  });
});

export default app;
