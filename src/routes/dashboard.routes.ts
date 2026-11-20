import { Router } from "express";
import { getDashboardStats } from "../controllers/dashboard.controller";
import { requireAuth } from "../middleware/auth";

const router = Router();

// Dashboard-এর সব route-এ login বাধ্যতামূলক
router.use(requireAuth);

router.get("/stats", getDashboardStats);

export default router;
