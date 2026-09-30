import { Request, Response } from "express";
import { AppError } from "../../utils/AppError";
import { asyncHandler } from "../../utils/asyncHandler";
import * as incidentService from "./incident.service";
import { validateCreateIncident, validateIncidentId, validateUpdateIncident } from "./incident.validation";

const requireUser = (req: Request) => {
  if (!req.user) throw new AppError(401, "Authentication required");
  return req.user;
};

export const listIncidents = asyncHandler(async (req: Request, res: Response) => {
  const { district, state, status, type, severity } = req.query;
  const incidents = await incidentService.listIncidents({
    district: typeof district === "string" ? district : undefined,
    state: typeof state === "string" ? state : undefined,
    status: typeof status === "string" ? status : undefined,
    type: typeof type === "string" ? type : undefined,
    severity: typeof severity === "string" ? severity : undefined,
  });
  res.json({ success: true, data: { incidents } });
});

export const getIncident = asyncHandler(async (req: Request, res: Response) => {
  const incident = await incidentService.getIncidentById(validateIncidentId(req.params.id));
  res.json({ success: true, data: { incident } });
});

export const createIncident = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const incident = await incidentService.createIncident(validateCreateIncident(req.body), user.id);
  res.status(201).json({ success: true, data: { incident } });
});

export const updateIncident = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const id = validateIncidentId(req.params.id);
  const incident = await incidentService.updateIncident(id, validateUpdateIncident(req.body), user);
  res.json({ success: true, data: { incident } });
});

export const verifyIncident = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const incident = await incidentService.verifyIncident(validateIncidentId(req.params.id), user.id);
  res.json({ success: true, data: { incident } });
});

export const closeIncident = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const incident = await incidentService.closeIncident(validateIncidentId(req.params.id), user.id);
  res.json({ success: true, data: { incident } });
});

export const uploadImages = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const id = validateIncidentId(req.params.id);
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  const incident = await incidentService.addImages(id, files, user);
  res.status(201).json({ success: true, data: { incident } });
});
