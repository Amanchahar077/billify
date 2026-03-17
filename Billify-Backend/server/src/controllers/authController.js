import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/User.js";

function signAccessToken(userId) {
  return jwt.sign({ sub: userId }, env.accessSecret, { expiresIn: env.accessExpires });
}

function signRefreshToken(userId) {
  return jwt.sign({ sub: userId }, env.refreshSecret, { expiresIn: env.refreshExpires });
}

function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    businessName: user.businessName,
    email: user.email,
    phone: user.phone,
    address: user.address,
    gstin: user.gstin,
    city: user.city,
    state: user.state,
    postalCode: user.postalCode,
    bankAccountHolder: user.bankAccountHolder,
    bankName: user.bankName,
    bankAccountNumber: user.bankAccountNumber,
    bankIfsc: user.bankIfsc,
    bankBranch: user.bankBranch
  };
}

export const register = asyncHandler(async (req, res) => {
  const {
    name,
    businessName,
    email,
    password,
    phone,
    address,
    gstin,
    city,
    state,
    postalCode,
    bankAccountHolder,
    bankName,
    bankAccountNumber,
    bankIfsc,
    bankBranch
  } = req.body;

  if (!name || !businessName || !email || !password) {
    throw new ApiError(400, "All fields are required");
  }

  const existing = await User.findOne({ email: email.toLowerCase().trim() });
  if (existing) {
    throw new ApiError(400, "Account already exists for this email");
  }

  const user = new User({
    name: name.trim(),
    businessName: businessName.trim(),
    email: email.toLowerCase().trim(),
    phone: phone?.trim(),
    address: address?.trim(),
    gstin: gstin?.trim(),
    city: city?.trim(),
    state: state?.trim(),
    postalCode: postalCode?.trim(),
    bankAccountHolder: bankAccountHolder?.trim(),
    bankName: bankName?.trim(),
    bankAccountNumber: bankAccountNumber?.trim(),
    bankIfsc: bankIfsc?.trim(),
    bankBranch: bankBranch?.trim()
  });
  await user.setPassword(password.trim());
  await user.save();

  const accessToken = signAccessToken(user._id);
  const refreshToken = signRefreshToken(user._id);
  user.refreshToken = refreshToken;
  await user.save();

  res
    .status(201)
    .cookie("accessToken", accessToken, { httpOnly: true, sameSite: "lax" })
    .cookie("refreshToken", refreshToken, { httpOnly: true, sameSite: "lax" })
    .json(new ApiResponse(201, { user: publicUser(user), accessToken, refreshToken }, "Welcome to Billify"));
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    throw new ApiError(400, "Email and password are required");
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    throw new ApiError(401, "Invalid credentials");
  }

  const valid = await user.validatePassword(password);
  if (!valid) {
    throw new ApiError(401, "Invalid credentials");
  }

  const accessToken = signAccessToken(user._id);
  const refreshToken = signRefreshToken(user._id);
  user.refreshToken = refreshToken;
  await user.save();

  res
    .status(200)
    .cookie("accessToken", accessToken, { httpOnly: true, sameSite: "lax" })
    .cookie("refreshToken", refreshToken, { httpOnly: true, sameSite: "lax" })
    .json(new ApiResponse(200, { user: publicUser(user), accessToken, refreshToken }, "Logged in"));
});

export const me = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, publicUser(req.user), "Profile loaded"));
});

export const logout = asyncHandler(async (req, res) => {
  if (req.user?._id) {
    await User.findByIdAndUpdate(req.user._id, { refreshToken: null });
  }
  res
    .clearCookie("accessToken")
    .clearCookie("refreshToken")
    .status(200)
    .json(new ApiResponse(200, {}, "Logged out"));
});

export const refresh = asyncHandler(async (req, res) => {
  const incoming = req.cookies?.refreshToken || req.body?.refreshToken;
  if (!incoming) {
    throw new ApiError(401, "Missing refresh token");
  }

  let payload;
  try {
    payload = jwt.verify(incoming, env.refreshSecret);
  } catch (err) {
    throw new ApiError(401, "Invalid refresh token");
  }

  const user = await User.findById(payload.sub);
  if (!user || user.refreshToken !== incoming) {
    throw new ApiError(401, "Refresh token mismatch");
  }

  const accessToken = signAccessToken(user._id);
  const refreshToken = signRefreshToken(user._id);
  user.refreshToken = refreshToken;
  await user.save();

  res
    .status(200)
    .cookie("accessToken", accessToken, { httpOnly: true, sameSite: "lax" })
    .cookie("refreshToken", refreshToken, { httpOnly: true, sameSite: "lax" })
    .json(new ApiResponse(200, { accessToken, refreshToken }, "Tokens refreshed"));
});

export const updateProfile = asyncHandler(async (req, res) => {
  const allowed = [
    "name",
    "businessName",
    "email",
    "phone",
    "address",
    "gstin",
    "city",
    "state",
    "postalCode",
    "bankAccountHolder",
    "bankName",
    "bankAccountNumber",
    "bankIfsc",
    "bankBranch"
  ];
  const updates = {};

  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      const value = typeof req.body[key] === "string" ? req.body[key].trim() : req.body[key];
      updates[key] = value;
    }
  }

  if (updates.email) {
    updates.email = updates.email.toLowerCase();
    const existing = await User.findOne({ email: updates.email, _id: { $ne: req.user._id } });
    if (existing) {
      throw new ApiError(400, "Email already in use");
    }
  }

  const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
  res.status(200).json(new ApiResponse(200, { user: publicUser(user) }, "Profile updated"));
});
