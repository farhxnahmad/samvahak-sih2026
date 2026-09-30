import { Request, Response } from "express";
import { HazardType } from "../../constants/enums";
import { asyncHandler } from "../../utils/asyncHandler";
import { isValidObjectId } from "../../utils/objectId";
import { AppError } from "../../utils/AppError";
import * as riskScoreService from "./riskScore.service";
import { validateCalculateRisk, validateRiskScoreId } from "./riskScore.validation";

const parseIntOrUndefined = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

/** Runs the Accessibility Risk Engine for a district and saves the result. */
export const calculateRisk = asyncHandler(async (req: Request, res: Response) => {
  const riskScore = await riskScoreService.calculateDistrictRisk(validateCalculateRisk(req.body));
  res.status(201).json({ success: true, data: { riskScore } });
});

/** History. GET /risk-scores?district=&hazardType=&category=&limit=&skip= */
export const listRiskScores = asyncHandler(async (req: Request, res: Response) => {
  const { district, hazardType, category, limit, skip } = req.query;
  const riskScores = await riskScoreService.listRiskScores({
    district: typeof district === "string" ? district : undefined,
    hazardType: typeof hazardType === "string" ? hazardType : undefined,
    category: typeof category === "string" ? category : undefined,
    limit: parseIntOrUndefined(limit),
    skip: parseIntOrUndefined(skip),
  });
  res.json({ success: true, data: { riskScores } });
});

export const getRiskScore = asyncHandler(async (req: Request, res: Response) => {
  const riskScore = await riskScoreService.getRiskScoreById(validateRiskScoreId(req.params.id));
  res.json({ success: true, data: { riskScore } });
});

/** GET /risk-scores/latest/:districtId?hazardType=overall */
export const getLatestRiskScore = asyncHandler(async (req: Request, res: Response) => {
  const districtId = req.params.districtId;
  if (!isValidObjectId(districtId)) throw new AppError(400, "A valid districtId is required");
  const hazardType = (typeof req.query.hazardType === "string" ? req.query.hazardType : "overall") as HazardType;
  const riskScore = await riskScoreService.getLatestRiskScore(districtId, hazardType);
  res.json({ success: true, data: { riskScore } });
});
