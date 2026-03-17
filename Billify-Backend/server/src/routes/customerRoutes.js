import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { listCustomers, getCustomer, createCustomer, updateCustomer, deleteCustomer } from "../controllers/customerController.js";

const router = Router();

router.use(requireAuth);
router.get("/", listCustomers);
router.post("/", createCustomer);
router.get("/:id", getCustomer);
router.put("/:id", updateCustomer);
router.delete("/:id", deleteCustomer);

export default router;
