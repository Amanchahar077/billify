import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Customer } from "../models/Customer.js";

export const listCustomers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const filter = { createdBy: req.user._id };
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { customerCode: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } }
    ];
  }

  const [customers, total] = await Promise.all([
    Customer.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    Customer.countDocuments(filter)
  ]);

  res.status(200).json(
    new ApiResponse(200, {
      customers,
      currentPage: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      totalCustomers: total
    }, "Customers loaded")
  );
});

export const getCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.findOne({ _id: req.params.id, createdBy: req.user._id });
  if (!customer) {
    throw new ApiError(404, "Customer not found");
  }
  res.status(200).json(new ApiResponse(200, customer, "Customer loaded"));
});

export const createCustomer = asyncHandler(async (req, res) => {
  const { name, customerCode, email, phone, address, gstin } = req.body;
  if (!name || !customerCode) {
    throw new ApiError(400, "Name and customer code are required");
  }

  const existing = await Customer.findOne({ customerCode: customerCode.trim(), createdBy: req.user._id });
  if (existing) {
    throw new ApiError(400, "Customer code already exists");
  }

  const customer = await Customer.create({
    name: name.trim(),
    customerCode: customerCode.trim(),
    email: email?.trim(),
    phone: phone?.trim(),
    address: address?.trim(),
    gstin: gstin?.trim(),
    createdBy: req.user._id
  });

  res.status(201).json(new ApiResponse(201, customer, "Customer created"));
});

export const updateCustomer = asyncHandler(async (req, res) => {
  const { name, email, phone, address, gstin } = req.body;
  const customer = await Customer.findOneAndUpdate(
    { _id: req.params.id, createdBy: req.user._id },
    { name, email, phone, address, gstin },
    { new: true, runValidators: true }
  );

  if (!customer) {
    throw new ApiError(404, "Customer not found");
  }

  res.status(200).json(new ApiResponse(200, customer, "Customer updated"));
});

export const deleteCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.findOneAndDelete({ _id: req.params.id, createdBy: req.user._id });
  if (!customer) {
    throw new ApiError(404, "Customer not found");
  }
  res.status(200).json(new ApiResponse(200, {}, "Customer deleted"));
});
