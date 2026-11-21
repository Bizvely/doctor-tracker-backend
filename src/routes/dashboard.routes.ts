import { Router } from "express";
import rateLimit from "express-rate-limit";
import { getDashboardStats } from "../controllers/dashboard.controller";
import { getDemoStatus, loadDemoData, removeDemoData } from "../controllers/demo.controller";
import { requireAuth } from "../middleware/auth";

const router = Router();

// Dashboard-এর সব route-এ login বাধ্যতামূলক
router.use(requireAuth);

// Demo data লোড/মোছা: ঘণ্টায় সর্বোচ্চ ৫ বার, শুধু login করা admin
const demoLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, message: "Too many requests, please try again later" },
});

router.get("/stats", getDashboardStats);

// Demo data এখন আছে কিনা (Settings পাতার switch-এর জন্য)
router.get("/demo-status", getDemoStatus);
// লোড: শুধু ফাঁকা database-এ
router.post("/demo-data", demoLimiter, loadDemoData);
// মোছা: শুধু demo ডাক্তার ও demo রোগী
router.delete("/demo-data", demoLimiter, removeDemoData);

export default router;
