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

  const details = err as {
    name?: string;
    code?: number;
    status?: number;
    keyPattern?: Record<string, unknown>;
  } | null;

  // একই মান দুইবার (যেমন একই email): MongoDB-র duplicate error
  if (details?.code === 11000) {
    const field = details.keyPattern ? Object.keys(details.keyPattern)[0] : "value";
    res.status(409).json({ success: false, message: `${field} already exists` });
    return;
  }

  // Database-এর যাচাইয়ে ভুল data
  if (details?.name === "ValidationError" || details?.name === "CastError") {
    res.status(400).json({ success: false, message: "Invalid data" });
    return;
  }

  // ভুল JSON পাঠালে বা body বেশি বড় হলে Express নিজে 4xx status দেয়
  if (typeof details?.status === "number" && details.status >= 400 && details.status < 500) {
    res.status(details.status).json({ success: false, message: "Invalid request" });
    return;
  }

  console.error(err);
  res.status(500).json({ success: false, message: "Something went wrong on the server" });
}
