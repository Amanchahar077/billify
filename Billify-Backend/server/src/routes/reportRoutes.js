import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { summary, exportCustomersCsv } from "../controllers/reportController.js";

const router = Router();

router.use(requireAuth);
router.get("/summary", summary);
router.get("/customers.csv", exportCustomersCsv);

export default router;
