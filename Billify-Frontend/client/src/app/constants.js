const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:5000/api/v1";
const REFRESH_KEY = "billify_refresh";

const currency = (value) => `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const emptyLineItem = () => ({ description: "", quantity: 1, rate: 0, taxRate: 0 });

export { API_BASE, currency, emptyLineItem, REFRESH_KEY };
