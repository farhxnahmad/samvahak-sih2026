import { RequestHandler } from "express";

const COLORS = { green: "\x1b[32m", yellow: "\x1b[33m", red: "\x1b[31m", reset: "\x1b[0m" };

/** Logs: time, method, url, status, duration. */
export const requestLogger: RequestHandler = (req, res, next) => {
  const start = process.hrtime.bigint();

  res.on("finish", () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    const status = res.statusCode;
    const color = status >= 500 ? COLORS.red : status >= 400 ? COLORS.yellow : COLORS.green;
    console.log(
      `${new Date().toISOString()} ${req.method} ${req.originalUrl} ${color}${status}${COLORS.reset} ${ms.toFixed(1)}ms`
    );
  });

  next();
};
