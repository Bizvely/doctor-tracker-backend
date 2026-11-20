import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env";
import { ApiError } from "../utils/ApiError";

const SAFE_METHODS = ["GET", "HEAD", "OPTIONS"];

// CSRF প্রতিরক্ষা (অন্য কোনো সাইট আপনার হয়ে অনুরোধ পাঠানোর চেষ্টা):
// ডাটা বদলানো অনুরোধ শুধু আমাদের Frontend থেকে এলেই চলবে
export function requireAllowedOrigin(req: Request, _res: Response, next: NextFunction): void {
  if (SAFE_METHODS.includes(req.method)) {
    next();
    return;
  }
  const origin = req.get("origin");
  if (origin && !env.clientOrigins.includes(origin)) {
    next(new ApiError(403, "Origin not allowed"));
    return;
  }
  next();
}
