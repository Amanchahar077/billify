const API_BASE = import.meta.env.VITE_API_BASE || "https://billify-1.onrender.com/api/v1";
const REFRESH_KEY = "billify_refresh";

const currency = (value) => `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const emptyLineItem = () => ({
  description: "",
  hsnSac: "",
  quantity: 1,
  unit: "Nos",
  listPrice: 0,
  rate: 0,
  discount: 0,
  cgstRate: 0,
  sgstRate: 0,
  taxRate: 0
});

export { API_BASE, currency, emptyLineItem, REFRESH_KEY };
