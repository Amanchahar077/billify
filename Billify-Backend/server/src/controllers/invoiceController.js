import { nanoid } from "nanoid";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Invoice } from "../models/Invoice.js";
import { Customer } from "../models/Customer.js";

function buildTotals(items) {
  let subtotal = 0;
  let taxTotal = 0;

  const normalized = items.map((item) => {
    const quantity = Number(item.quantity || 0);
    const listPrice = Number(item.listPrice ?? item.rate ?? 0);
    const discount = Number(item.discount || 0);
    const cgstRate = Number(item.cgstRate ?? (item.taxRate ? Number(item.taxRate) / 2 : 0));
    const sgstRate = Number(item.sgstRate ?? (item.taxRate ? Number(item.taxRate) / 2 : 0));
    const taxable = Math.max(0, quantity * listPrice - discount);
    const cgstAmount = taxable * (cgstRate / 100);
    const sgstAmount = taxable * (sgstRate / 100);
    const lineTotal = taxable + cgstAmount + sgstAmount;

    subtotal += taxable;
    taxTotal += cgstAmount + sgstAmount;

    return {
      description: String(item.description || "").trim(),
      hsnSac: String(item.hsnSac || "").trim(),
      quantity,
      unit: String(item.unit || "Nos"),
      listPrice,
      rate: listPrice,
      discount,
      cgstRate,
      sgstRate,
      taxRate: cgstRate + sgstRate,
      lineTotal
    };
  });

  const grandTotal = subtotal + taxTotal;

  return { items: normalized, subtotal, taxTotal, grandTotal };
}

function generateInvoiceNumber() {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `BILL-${stamp}-${nanoid(4).toUpperCase()}`;
}

export const listInvoices = asyncHandler(async (req, res) => {
  const invoices = await Invoice.find({ createdBy: req.user._id })
    .populate("customer", "name customerCode")
    .sort({ createdAt: -1 });

  res.status(200).json(new ApiResponse(200, invoices, "Invoices loaded"));
});

export const getInvoice = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findOne({ _id: req.params.id, createdBy: req.user._id })
    .populate("customer", "name customerCode email phone address gstin");

  if (!invoice) {
    throw new ApiError(404, "Invoice not found");
  }

  res.status(200).json(new ApiResponse(200, invoice, "Invoice loaded"));
});

export const createInvoice = asyncHandler(async (req, res) => {
  const { customerId, issueDate, dueDate, items, notes, status } = req.body;

  if (!customerId || !issueDate || !Array.isArray(items) || items.length === 0) {
    throw new ApiError(400, "Customer, issue date, and at least one item are required");
  }

  const customer = await Customer.findOne({ _id: customerId, createdBy: req.user._id });
  if (!customer) {
    throw new ApiError(404, "Customer not found");
  }

  const totals = buildTotals(items);
  if (totals.items.some((item) => !item.description)) {
    throw new ApiError(400, "Each line item needs a description");
  }

  const invoice = await Invoice.create({
    invoiceNumber: generateInvoiceNumber(),
    customer: customer._id,
    issueDate,
    dueDate: dueDate || null,
    status: status || "draft",
    notes: notes?.trim(),
    items: totals.items,
    subtotal: totals.subtotal,
    taxTotal: totals.taxTotal,
    grandTotal: totals.grandTotal,
    createdBy: req.user._id
  });

  res.status(201).json(new ApiResponse(201, invoice, "Invoice created"));
});

export const updateInvoiceStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const validStatuses = ["draft", "sent", "paid"];
  if (!validStatuses.includes(status)) {
    throw new ApiError(400, "Invalid status");
  }

  const invoice = await Invoice.findOneAndUpdate(
    { _id: req.params.id, createdBy: req.user._id },
    { status },
    { new: true }
  );

  if (!invoice) {
    throw new ApiError(404, "Invoice not found");
  }

  res.status(200).json(new ApiResponse(200, invoice, "Invoice updated"));
});

export const deleteInvoice = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findOneAndDelete({ _id: req.params.id, createdBy: req.user._id });
  if (!invoice) {
    throw new ApiError(404, "Invoice not found");
  }
  res.status(200).json(new ApiResponse(200, {}, "Invoice deleted"));
});
