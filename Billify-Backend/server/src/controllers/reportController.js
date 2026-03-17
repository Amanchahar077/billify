import { Parser } from "json2csv";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Invoice } from "../models/Invoice.js";
import { Customer } from "../models/Customer.js";

function monthRange(monthValue) {
  if (!monthValue) {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return { start, end };
  }

  const [year, month] = monthValue.split("-").map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  return { start, end };
}

export const summary = asyncHandler(async (req, res) => {
  const { start, end } = monthRange(req.query.month);
  const match = { createdBy: req.user._id, issueDate: { $gte: start, $lt: end } };

  const invoices = await Invoice.find(match);
  const revenue = invoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
  const paid = invoices.filter((inv) => inv.status === "paid").length;
  const pending = invoices.filter((inv) => inv.status !== "paid").length;

  res.status(200).json(
    new ApiResponse(200, {
      month: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`,
      invoiceCount: invoices.length,
      paidCount: paid,
      pendingCount: pending,
      revenue
    }, "Summary ready")
  );
});

export const exportCustomersCsv = asyncHandler(async (req, res) => {
  const customers = await Customer.find({ createdBy: req.user._id });
  const invoices = await Invoice.find({ createdBy: req.user._id });

  const totalsByCustomer = invoices.reduce((acc, invoice) => {
    const key = invoice.customer.toString();
    acc[key] = (acc[key] || 0) + invoice.grandTotal;
    return acc;
  }, {});

  const rows = customers.map((customer) => ({
    Customer: customer.name,
    "Customer Code": customer.customerCode,
    Email: customer.email || "",
    Phone: customer.phone || "",
    GSTIN: customer.gstin || "",
    "Total Billed": totalsByCustomer[customer._id.toString()] || 0
  }));

  const parser = new Parser();
  const csv = parser.parse(rows);

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename=billify_customers_${Date.now()}.csv`);
  res.status(200).send(csv);
});
