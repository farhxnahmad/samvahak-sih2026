import { RiskCategory } from "../../constants/enums";
import { IRiskInputs } from "./riskScore.model";

/**
 * Pure risk calculation - no DB access, easy to unit test.
 *
 * Weights (sum to 1):
 *   incident volume    25%  - how many relevant incidents were reported
 *   incident severity  30%  - how bad those incidents were
 *   weather severity   25%  - rainfall/storm intensity, 0-100
 *   route condition    20%  - road/bridge disruption, 0-100 (higher = worse)
 */
const WEIGHTS = {
  incidentVolume: 0.25,
  incidentSeverity: 0.3,
  weather: 0.25,
  routeCondition: 0.2,
} as const;

/** More than this many relevant incidents in the window already maxes out the volume component. */
const INCIDENT_COUNT_SATURATION = 8;

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export function incidentVolumeScore(incidentCount: number): number {
  return clamp((incidentCount / INCIDENT_COUNT_SATURATION) * 100, 0, 100);
}

export function categorize(score: number): RiskCategory {
  if (score < 25) return "low";
  if (score < 50) return "moderate";
  if (score < 75) return "high";
  return "critical";
}

export function calculateRiskScore(inputs: IRiskInputs): { score: number; category: RiskCategory } {
  const volume = incidentVolumeScore(inputs.incidentCount);

  const weighted =
    volume * WEIGHTS.incidentVolume +
    clamp(inputs.incidentSeverityScore, 0, 100) * WEIGHTS.incidentSeverity +
    clamp(inputs.weatherSeverityScore, 0, 100) * WEIGHTS.weather +
    clamp(inputs.routeConditionScore, 0, 100) * WEIGHTS.routeCondition;

  const score = Math.round(clamp(weighted, 0, 100));
  return { score, category: categorize(score) };
}
