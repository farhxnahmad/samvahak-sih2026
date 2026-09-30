import { Router } from "express";
import * as dashboardController from "./dashboard.controller";

export const dashboardRoutes = Router();

// All read-only and public, same as the other history/listing endpoints in this API.
dashboardRoutes.get("/active-incidents", dashboardController.getActiveIncidents);
dashboardRoutes.get("/incident-trends", dashboardController.getIncidentTrends);
dashboardRoutes.get("/district-risk-scores", dashboardController.getDistrictRiskScores);
dashboardRoutes.get("/alert-statistics", dashboardController.getAlertStatistics);
