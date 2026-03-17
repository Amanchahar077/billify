import mongoose from "mongoose";

const lineItemSchema = new mongoose.Schema(
  {
    description: { type: String, required: true, trim: true },
    hsnSac: { type: String, trim: true },
    quantity: { type: Number, required: true },
    unit: { type: String, trim: true, default: "Nos" },
    listPrice: { type: Number },
    rate: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    cgstRate: { type: Number, default: 0 },
    sgstRate: { type: Number, default: 0 },
    taxRate: { type: Number, default: 0 },
    lineTotal: { type: Number, required: true }
  },
  { _id: false }
);

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true, trim: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true },
    issueDate: { type: Date, required: true },
    dueDate: { type: Date },
    status: { type: String, enum: ["draft", "sent", "paid"], default: "draft" },
    notes: { type: String, trim: true },
    items: { type: [lineItemSchema], default: [] },
    subtotal: { type: Number, required: true },
    taxTotal: { type: Number, required: true },
    grandTotal: { type: Number, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

invoiceSchema.index({ invoiceNumber: 1, createdBy: 1 }, { unique: true });

export const Invoice = mongoose.model("Invoice", invoiceSchema);
