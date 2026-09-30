import { HazardType, IncidentType, Severity } from "../../constants/enums";
import { AppError } from "../../utils/AppError";
import { District } from "../district/district.model";
import { IIncident, Incident } from "../incident/incident.model";
import { calculateRiskScore } from "./riskEngine";
import { generateExplanation } from "./riskExplanation";
import { IRiskInputs, RiskScore } from "./riskScore.model";
import { CalculateRiskInput } from "./riskScore.validation";

/** Maps a risk hazardType to the incident types that count toward it. "overall" counts everything. */
const HAZARD_TO_INCIDENT_TYPES: Record<HazardType, IncidentType[] | null> = {
  overall: null,
  flood: ["flood", "heavy_rainfall"],
  landslide: ["landslide"],
  road_disruption: ["road_blockage", "bridge_damage", "accident"],
};

const SEVERITY_WEIGHT: Record<Severity, number> = { low: 25, medium: 50, high: 75, critical: 100 };

async function gatherIncidentInputs(district: string, hazardType: HazardType, lookbackDays: number) {
  const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);
  const types = HAZARD_TO_INCIDENT_TYPES[hazardType];

  const query: Record<string, unknown> = {
    district,
    createdAt: { $gte: since },
    status: { $ne: "rejected" },
  };
  if (types) query.type = { $in: types };

  const incidents = await Incident.find(query).select("severity").lean<Pick<IIncident, "severity">[]>();

  const incidentCount = incidents.length;
  const incidentSeverityScore = incidentCount
    ? Math.round(incidents.reduce((sum, i) => sum + SEVERITY_WEIGHT[i.severity], 0) / incidentCount)
    : 0;

  return { incidentCount, incidentSeverityScore };
}

/**
 * Runs the Accessibility Risk Engine for one district and saves the result.
 * Weather and route-condition scores are supplied by the caller (this prototype has no
 * live weather/traffic feed); incident count and severity are read from the Incident collection.
 */
export async function calculateDistrictRisk(input: CalculateRiskInput) {
  const district = await District.findById(input.district);
  if (!district) throw new AppError(404, "District not found");

  const { incidentCount, incidentSeverityScore } = await gatherIncidentInputs(
    input.district,
    input.hazardType,
    input.lookbackDays
  );

  const inputs: IRiskInputs = {
    incidentCount,
    incidentSeverityScore,
    weatherSeverityScore: input.weatherSeverityScore,
    routeConditionScore: input.routeConditionScore,
  };

  const { score, category } = calculateRiskScore(inputs);

  const previous = await RiskScore.findOne({ district: input.district, hazardType: input.hazardType }).sort({
    computedAt: -1,
  });

  const explanation = generateExplanation(district.name, inputs, score, category, previous?.score);

  return RiskScore.create({
    district: input.district,
    hazardType: input.hazardType,
    score,
    category,
    inputs,
    explanation,
    computedAt: new Date(),
  });
}

export interface RiskHistoryFilter {
  district?: string;
  hazardType?: string;
  category?: string;
  limit?: number;
  skip?: number;
}

export function listRiskScores(filter: RiskHistoryFilter) {
  const query: Record<string, unknown> = {};
  if (filter.district) query.district = filter.district;
  if (filter.hazardType) query.hazardType = filter.hazardType;
  if (filter.category) query.category = filter.category;

  const limit = Math.min(filter.limit ?? 50, 200);
  const skip = filter.skip ?? 0;

  return RiskScore.find(query).sort({ computedAt: -1 }).skip(skip).limit(limit);
}

export async function getRiskScoreById(id: string) {
  const riskScore = await RiskScore.findById(id);
  if (!riskScore) throw new AppError(404, "Risk score not found");
  return riskScore;
}

/** Most recent score for a district (+ optional hazardType, default "overall"). */
export async function getLatestRiskScore(district: string, hazardType: HazardType) {
  const riskScore = await RiskScore.findOne({ district, hazardType }).sort({ computedAt: -1 });
  if (!riskScore) throw new AppError(404, "No risk score has been computed for this district yet");
  return riskScore;
}
