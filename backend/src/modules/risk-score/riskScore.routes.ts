import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth.middleware";
import * as riskScoreController from "./riskScore.controller";

export const riskScoreRoutes = Router();

riskScoreRoutes.get("/", riskScoreController.listRiskScores); // history, public
riskScoreRoutes.get("/latest/:districtId", riskScoreController.getLatestRiskScore);
riskScoreRoutes.get("/:id", riskScoreController.getRiskScore);

riskScoreRoutes.post(
  "/calculate",
  authenticate,
  authorize("district_officer", "government_officer"),
  riskScoreController.calculateRisk
);
