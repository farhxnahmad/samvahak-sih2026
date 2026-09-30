import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth.middleware";
import * as simulationController from "./simulation.controller";

export const simulationRoutes = Router();

simulationRoutes.get("/", simulationController.listSimulations); // history, public
simulationRoutes.get("/:id", simulationController.getSimulation);

simulationRoutes.post(
  "/run",
  authenticate,
  authorize("district_officer", "government_officer"),
  simulationController.runSimulation
);
