import { Router } from "express";
import { changePassword, login, logout, me } from "../controllers/auth.controller";
import { requireAuth } from "../middleware/auth";
import { changePasswordLimiter, loginLimiter } from "../middleware/rateLimiters";
import { validateBody } from "../middleware/validate";
import { changePasswordSchema, loginSchema } from "../validators/auth.validator";

const router = Router();

router.post("/login", loginLimiter, validateBody(loginSchema), login);
router.post("/logout", logout);
router.get("/me", requireAuth, me);
router.post(
  "/change-password",
  requireAuth,
  changePasswordLimiter,
  validateBody(changePasswordSchema),
  changePassword
);

export default router;
