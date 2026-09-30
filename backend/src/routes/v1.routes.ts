import { Router } from "express";
import mongoose from "mongoose";
import { authRoutes } from "../modules/auth/auth.routes";
import { geographyRoutes } from "../modules/geography/geography.routes";
import { incidentRoutes } from "../modules/incident/incident.routes";
import { alertRoutes } from "../modules/alert/alert.routes";
import { riskScoreRoutes } from "../modules/risk-score/riskScore.routes";
import { dashboardRoutes } from "../modules/dashboard/dashboard.routes";
import { simulationRoutes } from "../modules/simulation/simulation.routes";
import { copilotRoutes } from "../modules/copilot/copilot.routes";

const v1Router = Router();

v1Router.get("/health", (_req, res) => {
  const dbStates = ["disconnected", "connected", "connecting", "disconnecting"];
  res.json({
    success: true,
    service: "samvahak-backend",
    version: "v1",
    uptimeSeconds: Math.round(process.uptime()),
    database: dbStates[mongoose.connection.readyState] ?? "unknown",
  });
});

v1Router.use("/auth", authRoutes);
v1Router.use("/", geographyRoutes); // /states, /states/:stateId/districts, /districts/:districtId/villages
v1Router.use("/incidents", incidentRoutes);
v1Router.use("/alerts", alertRoutes);
v1Router.use("/risk-scores", riskScoreRoutes);
v1Router.use("/dashboard", dashboardRoutes);
v1Router.use("/simulations", simulationRoutes);
v1Router.use("/copilot", copilotRoutes);

export default v1Router;
