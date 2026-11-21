import { Router } from "express";
import rateLimit from "express-rate-limit";
import { getDashboardStats } from "../controllers/dashboard.controller";
import { loadDemoData } from "../controllers/demo.controller";
import { requireAuth } from "../middleware/auth";

const router = Router();

// Dashboard-এর সব route-এ login বাধ্যতামূলক
router.use(requireAuth);

router.get("/stats", getDashboardStats);

// Demo data লোড: ঘণ্টায় সর্বোচ্চ ৫ বার, শুধু login করা admin, শুধু ফাঁকা database-এ
const demoLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, message: "Too many requests, please try again later" },
});
router.post("/demo-data", demoLimiter, loadDemoData);

export default router;
