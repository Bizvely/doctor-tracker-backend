import rateLimit from "express-rate-limit";

// Login-এর জন্য কড়া সীমা: ১৫ মিনিটে ১০ বার ভুল চেষ্টা (সফল login গোনা হয় না)
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, message: "Too many login attempts. Please try again in 15 minutes." },
});

// Password বদলের জন্য আরও কড়া: ১৫ মিনিটে ৫ বার ভুল চেষ্টা (সফল হলে গোনা হয় না)
export const changePasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  skipSuccessfulRequests: true,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, message: "Too many attempts. Please try again in 15 minutes." },
});
