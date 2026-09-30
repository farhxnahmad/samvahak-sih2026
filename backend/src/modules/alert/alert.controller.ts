import { Request, Response } from "express";
import { AppError } from "../../utils/AppError";
import { asyncHandler } from "../../utils/asyncHandler";
import * as alertService from "./alert.service";
import { validateAlertId, validateCreateAlert } from "./alert.validation";

const requireUser = (req: Request) => {
  if (!req.user) throw new AppError(401, "Authentication required");
  return req.user;
};

const parseIntOrUndefined = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

/** Alert History. GET /alerts?district=&severity=&status=&hazardType=&limit=&skip= */
export const listAlerts = asyncHandler(async (req: Request, res: Response) => {
  const { district, severity, status, hazardType, limit, skip } = req.query;
  const alerts = await alertService.listAlerts({
    district: typeof district === "string" ? district : undefined,
    severity: typeof severity === "string" ? severity : undefined,
    status: typeof status === "string" ? status : undefined,
    hazardType: typeof hazardType === "string" ? hazardType : undefined,
    limit: parseIntOrUndefined(limit),
    skip: parseIntOrUndefined(skip),
  });
  res.json({ success: true, data: { alerts } });
});

export const getAlert = asyncHandler(async (req: Request, res: Response) => {
  const alert = await alertService.getAlertById(validateAlertId(req.params.id));
  res.json({ success: true, data: { alert } });
});

/** Create Alert: saves it, does not push to sockets yet. */
export const createAlert = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const alert = await alertService.createAlert(validateCreateAlert(req.body), user.id);
  res.status(201).json({ success: true, data: { alert } });
});

/** Broadcast Alert: pushes an existing alert over Socket.io. Can be called again to resend. */
export const broadcastAlert = asyncHandler(async (req: Request, res: Response) => {
  const alert = await alertService.broadcastExistingAlert(validateAlertId(req.params.id));
  res.json({ success: true, data: { alert } });
});

export const resolveAlert = asyncHandler(async (req: Request, res: Response) => {
  const alert = await alertService.resolveAlert(validateAlertId(req.params.id));
  res.json({ success: true, data: { alert } });
});
