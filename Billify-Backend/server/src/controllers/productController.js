import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Product } from "../models/Product.js";

export const listProducts = asyncHandler(async (req, res) => {
  const products = await Product.find({ createdBy: req.user._id }).sort({ createdAt: -1 });
  res.status(200).json(new ApiResponse(200, products, "Products loaded"));
});

export const createProduct = asyncHandler(async (req, res) => {
  const { name, sku, price, taxRate } = req.body;
  if (!name || price == null) {
    throw new ApiError(400, "Product name and price are required");
  }

  const product = await Product.create({
    name: name.trim(),
    sku: sku?.trim(),
    price: Number(price),
    taxRate: Number(taxRate || 0),
    createdBy: req.user._id
  });

  res.status(201).json(new ApiResponse(201, product, "Product created"));
});

export const updateProduct = asyncHandler(async (req, res) => {
  const { name, sku, price, taxRate } = req.body;
  const product = await Product.findOneAndUpdate(
    { _id: req.params.id, createdBy: req.user._id },
    { name, sku, price, taxRate },
    { new: true, runValidators: true }
  );

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  res.status(200).json(new ApiResponse(200, product, "Product updated"));
});

export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findOneAndDelete({ _id: req.params.id, createdBy: req.user._id });
  if (!product) {
    throw new ApiError(404, "Product not found");
  }
  res.status(200).json(new ApiResponse(200, {}, "Product deleted"));
});
