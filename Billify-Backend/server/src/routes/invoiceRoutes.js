import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { listInvoices, getInvoice, createInvoice, updateInvoiceStatus, deleteInvoice } from "../controllers/invoiceController.js";

const router = Router();

router.use(requireAuth);
router.get("/", listInvoices);
router.post("/", createInvoice);
router.get("/:id", getInvoice);
router.patch("/:id/status", updateInvoiceStatus);
router.delete("/:id", deleteInvoice);

export default router;
