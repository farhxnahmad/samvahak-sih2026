import { NextFunction, Request, RequestHandler, Response } from "express";

/** Wrap async controllers so thrown errors reach the global error handler. */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };
