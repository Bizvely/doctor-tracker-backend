import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/ApiError";

// অজানা route-এর জন্য 404
export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ success: false, message: "Route not found" });
}

// সব error এখানে আসে। ভেতরের তথ্য (stack trace) কখনো বাইরে যায় না।
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({ success: false, message: err.message });
    return;
  }

  // ভুল JSON পাঠালে বা body বেশি বড় হলে Express নিজে 4xx status দেয়
  const status = (err as { status?: number } | null)?.status;
  if (typeof status === "number" && status >= 400 && status < 500) {
    res.status(status).json({ success: false, message: "Invalid request" });
    return;
  }

  console.error(err);
  res.status(500).json({ success: false, message: "Something went wrong on the server" });
}
