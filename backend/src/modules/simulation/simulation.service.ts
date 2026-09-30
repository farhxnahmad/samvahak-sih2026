import { AppError } from "../../utils/AppError";
import { District } from "../district/district.model";
import { Village } from "../village/village.model";
import { buildRecommendations, buildSummary, computeVillageImpact } from "./simulationEngine";
import { Simulation } from "./simulation.model";
import { RunSimulationInput } from "./simulation.validation";

const SCENARIO_LABEL: Record<string, string> = {
  flood: "Flood",
  landslide: "Landslide",
  road_closure: "Road Closure",
  bridge_failure: "Bridge Failure",
};

/**
 * Runs a what-if disaster scenario for a district and saves the result as a new Simulation
 * document. IMPORTANT: this only ever READS District and Village, and only ever WRITES a new
 * Simulation record - it never updates a Village, District, Incident, RiskScore or Alert.
 * Nothing about the real operational data changes just because a simulation was run.
 */
export async function runSimulation(input: RunSimulationInput, createdBy: string) {
  const district = await District.findById(input.district); // read-only
  if (!district) throw new AppError(404, "District not found");

  const villages = await Village.find({ district: input.district }); // read-only
  if (villages.length === 0) {
    throw new AppError(400, "This district has no villages on record to simulate against");
  }

  const impacts = villages.map((village) => computeVillageImpact(village, input.scenarioType, input.severity));
  const districtPopulation = villages.reduce((sum, v) => sum + (v.population ?? 0), 0);
  const summary = buildSummary(impacts, districtPopulation);
  const recommendations = buildRecommendations(input.scenarioType, input.severity, summary);

  const name =
    input.name ??
    `${SCENARIO_LABEL[input.scenarioType]} (${input.severity}) - ${district.name}`;

  return Simulation.create({
    name,
    scenarioType: input.scenarioType,
    district: input.district,
    severity: input.severity,
    createdBy,
    status: "completed",
    impacts,
    summary,
    recommendations,
    completedAt: new Date(),
  });
}

export interface SimulationHistoryFilter {
  district?: string;
  scenarioType?: string;
  createdBy?: string;
  limit?: number;
  skip?: number;
}

export function listSimulations(filter: SimulationHistoryFilter) {
  const query: Record<string, unknown> = {};
  if (filter.district) query.district = filter.district;
  if (filter.scenarioType) query.scenarioType = filter.scenarioType;
  if (filter.createdBy) query.createdBy = filter.createdBy;

  const limit = Math.min(filter.limit ?? 50, 200);
  const skip = filter.skip ?? 0;

  return Simulation.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit);
}

export async function getSimulationById(id: string) {
  const simulation = await Simulation.findById(id);
  if (!simulation) throw new AppError(404, "Simulation not found");
  return simulation;
}
