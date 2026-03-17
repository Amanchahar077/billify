import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/User.js";

export async function requireAuth(req, res, next) {
  try {
    const bearer = req.headers.authorization || "";
    const token = bearer.startsWith("Bearer ") ? bearer.slice(7) : null;
    const cookieToken = req.cookies?.accessToken;
    const accessToken = token || cookieToken;

    if (!accessToken) {
      throw new ApiError(401, "Authentication required");
    }

    const payload = jwt.verify(accessToken, env.accessSecret);
    const user = await User.findById(payload.sub).select("-passwordHash -refreshToken");
    if (!user) {
      throw new ApiError(401, "User not found");
    }

    req.user = user;
    next();
  } catch (err) {
    next(new ApiError(401, "Invalid or expired token"));
  }
}
