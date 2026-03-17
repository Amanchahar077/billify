import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    sku: { type: String, trim: true },
    hsnSac: { type: String, trim: true },
    price: { type: Number, required: true },
    cgstRate: { type: Number, default: 0 },
    sgstRate: { type: Number, default: 0 },
    taxRate: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

productSchema.index({ name: 1, createdBy: 1 });

export const Product = mongoose.model("Product", productSchema);
