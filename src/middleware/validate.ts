import type { RequestHandler } from "express";
import type { ZodTypeAny } from "zod";
import { ApiError } from "../utils/ApiError";

// Request body যাচাই। ভুল হলে 400, সঠিক হলে পরিষ্কার করা data req.body-তে বসে।
export function validateBody(schema: ZodTypeAny): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const message = result.error.issues
        .map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`)
        .join("; ");
      next(new ApiError(400, message));
      return;
    }
    req.body = result.data;
    next();
  };
}
