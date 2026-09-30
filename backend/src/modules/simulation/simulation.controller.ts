import { Request, Response } from "express";
import { AppError } from "../../utils/AppError";
import { asyncHandler } from "../../utils/asyncHandler";
import { asQueryString, parseIntInRange } from "../../utils/queryParsing";
import * as simulationService from "./simulation.service";
import { validateRunSimulation, validateSimulationId } from "./simulation.validation";

const requireUser = (req: Request) => {
  if (!req.user) throw new AppError(401, "Authentication required");
  return req.user;
};

/** Runs a disaster simulation. Read-only against real data - only creates a new Simulation record. */
export const runSimulation = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const simulation = await simulationService.runSimulation(validateRunSimulation(req.body), user.id);
  res.status(201).json({ success: true, data: { simulation } });
});

export const listSimulations = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as Record<string, unknown>;
  const simulations = await simulationService.listSimulations({
    district: asQueryString(q.district),
    scenarioType: asQueryString(q.scenarioType),
    createdBy: asQueryString(q.createdBy),
    limit: parseIntInRange(q.limit, 50, 1, 200),
    skip: parseIntInRange(q.skip, 0, 0, Number.MAX_SAFE_INTEGER),
  });
  res.json({ success: true, data: { simulations } });
});

export const getSimulation = asyncHandler(async (req: Request, res: Response) => {
  const simulation = await simulationService.getSimulationById(validateSimulationId(req.params.id));
  res.json({ success: true, data: { simulation } });
});
