import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import * as dashboardService from "./dashboard.service";
import { validateDays, validateHazardType, validateScope } from "./dashboard.validation";

export const getActiveIncidents = asyncHandler(async (req: Request, res: Response) => {
  const scope = validateScope(req.query as Record<string, unknown>);
  const summary = await dashboardService.getActiveIncidentsSummary(scope);
  res.json({ success: true, data: summary });
});

export const getIncidentTrends = asyncHandler(async (req: Request, res: Response) => {
  const scope = validateScope(req.query as Record<string, unknown>);
  const days = validateDays(req.query as Record<string, unknown>);
  const trends = await dashboardService.getIncidentTrends(scope, days);
  res.json({ success: true, data: { days, trends } });
});

export const getDistrictRiskScores = asyncHandler(async (req: Request, res: Response) => {
  const scope = validateScope(req.query as Record<string, unknown>);
  const hazardType = validateHazardType(req.query as Record<string, unknown>);
  const riskScores = await dashboardService.getDistrictRiskScores(scope, hazardType);
  res.json({ success: true, data: { hazardType, riskScores } });
});

export const getAlertStatistics = asyncHandler(async (req: Request, res: Response) => {
  const scope = validateScope(req.query as Record<string, unknown>);
  const days = validateDays(req.query as Record<string, unknown>);
  const stats = await dashboardService.getAlertStatistics(scope, days);
  res.json({ success: true, data: { days, ...stats } });
});
