import { ScenarioType, Severity } from "../../constants/enums";
import { IVillage } from "../village/village.model";
import { ISimulationImpact, ISimulationSummary } from "./simulation.model";

/**
 * Pure, read-only projection logic - takes village data in, returns a hypothetical impact out.
 * Nothing here touches the database. It never modifies a Village, District, Incident, RiskScore
 * or Alert document; the only thing that gets written anywhere is a new Simulation record.
 */

/** Estimated share of a village's population affected, by scenario severity. */
const IMPACT_FRACTION_BY_SEVERITY: Record<Severity, number> = {
  low: 0.1,
  medium: 0.3,
  high: 0.6,
  critical: 0.9,
};

/** Severities at which this scenario type is assumed to cut road access for a connected village. */
const ROAD_LOSS_SEVERITIES: Record<ScenarioType, Severity[]> = {
  road_closure: ["medium", "high", "critical"],
  bridge_failure: ["medium", "high", "critical"],
  flood: ["high", "critical"],
  landslide: ["high", "critical"],
};

type VillageInput = Pick<IVillage, "_id" | "name" | "population" | "hasRoadAccess"> & { _id: unknown };

export function computeVillageImpact(village: VillageInput, scenarioType: ScenarioType, severity: Severity): ISimulationImpact {
  const population = village.population ?? 0;
  const estimatedAffectedPopulation = Math.round(population * IMPACT_FRACTION_BY_SEVERITY[severity]);
  const roadAccessLost = village.hasRoadAccess && ROAD_LOSS_SEVERITIES[scenarioType].includes(severity);

  return {
    village: village._id as ISimulationImpact["village"],
    villageName: village.name,
    impactLevel: severity,
    estimatedAffectedPopulation,
    roadAccessLost,
  };
}

export function buildSummary(impacts: ISimulationImpact[], districtPopulation: number): ISimulationSummary {
  const totalVillagesAffected = impacts.length;
  const totalPopulationImpact = impacts.reduce((sum, i) => sum + i.estimatedAffectedPopulation, 0);
  const villagesLosingRoadAccess = impacts.filter((i) => i.roadAccessLost).length;

  return {
    totalVillagesAffected,
    totalPopulationImpact,
    districtPopulation,
    populationImpactPercent: districtPopulation
      ? Math.round((totalPopulationImpact / districtPopulation) * 100)
      : 0,
    villagesLosingRoadAccess,
    accessibilityImpactPercent: totalVillagesAffected
      ? Math.round((villagesLosingRoadAccess / totalVillagesAffected) * 100)
      : 0,
  };
}

const SCENARIO_ADVICE: Record<ScenarioType, string> = {
  flood: "Pre-position relief supplies and identify shelters on higher ground before water levels rise.",
  landslide: "Restrict movement on known slide-prone stretches and inspect slopes and retaining walls.",
  road_closure: "Deploy road-clearance teams and publish detour routes to affected villages.",
  bridge_failure: "Close the affected bridge to all traffic immediately pending a structural inspection.",
};

/** Rule-based, deterministic - no external AI call, so this works offline for a demo. */
export function buildRecommendations(
  scenarioType: ScenarioType,
  severity: Severity,
  summary: ISimulationSummary
): string[] {
  const recommendations: string[] = [SCENARIO_ADVICE[scenarioType]];

  if (severity === "high" || severity === "critical") {
    recommendations.push("Activate the district emergency operations center and notify the state disaster management authority.");
  }
  if (summary.villagesLosingRoadAccess > 0) {
    recommendations.push(
      `Arrange alternate transport (boats, airlift, or temporary tracks) for the ${summary.villagesLosingRoadAccess} village(s) expected to lose road access.`
    );
  }
  if (summary.populationImpactPercent >= 50) {
    recommendations.push("Consider evacuation advisories for the worst-affected villages given the scale of population impact.");
  }
  recommendations.push("Send SMS/radio alerts to affected villages and keep the district control room updated as the situation develops.");

  return recommendations;
}
