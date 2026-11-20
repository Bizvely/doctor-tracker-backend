import type { NextFunction, Request, RequestHandler, Response } from "express";

// async function-এর error ধরে errorHandler-এ পাঠায় (Express 4 নিজে এটা করে না)
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}
