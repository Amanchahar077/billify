import { Router } from "express";
import { register, login, logout, me, refresh, updateProfile } from "../controllers/authController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refresh);
router.get("/me", requireAuth, me);
router.put("/profile", requireAuth, updateProfile);
router.post("/logout", requireAuth, logout);

export default router;
