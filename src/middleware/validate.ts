import type { RequestHandler } from "express";
import type { ZodError, ZodTypeAny } from "zod";
import { ApiError } from "../utils/ApiError";

function buildMessage(error: ZodError): string {
  return error.issues.map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`).join("; ");
}

// Request body যাচাই। ভুল হলে 400, সঠিক হলে পরিষ্কার করা data req.body-তে বসে।
export function validateBody(schema: ZodTypeAny): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      next(new ApiError(400, buildMessage(result.error)));
      return;
    }
    req.body = result.data;
    next();
  };
}

// URL query (?page=2&search=...) যাচাই। পরিষ্কার করা data res.locals.query-তে বসে।
export function validateQuery(schema: ZodTypeAny): RequestHandler {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      next(new ApiError(400, buildMessage(result.error)));
      return;
    }
    res.locals.query = result.data;
    next();
  };
}
