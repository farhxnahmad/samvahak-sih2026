import type { GoodId } from "../supply/goods";
import type { Emergency, MedicalRisk, VillageState } from "../isolation/types";
import type { LatLng } from "../types";

export type DisasterType = "flood" | "landslide" | "bridge" | "blockage" | "rainfall";
export type Severity = 1 | 2 | 3 | 4;

export const STEPS = [0, 6, 12, 24, 48] as const;
export type Step = (typeof STEPS)[number];

export interface ScenarioConfig {
  state: string;
  districtId: string;
  type: DisasterType;
  severity: Severity;
}

export type RoadCondition = "blocked" | "degraded";

export interface RoadState {
  edgeId: string;
  condition: RoadCondition;
  stretch: { startKm: number; endKm: number };
}

export interface DisasterVillage {
  state: VillageState;
  emergency: Emergency;
  exposed: boolean;
  healthBaseKm: number;
  healthAfterKm: number | null;
  facilityId: string | null;
  reason: string;
}

export type AlertLevel = "info" | "warning" | "critical";

export interface DisasterAlert {
  id: string;
  hour: Step;
  level: AlertLevel;
  title: string;
  detail: string;
}

export interface DistrictScore {
  base: number;
  score: number;
  delta: number;
}

export interface StepResult {
  hour: Step;
  radiusKm: number;
  roads: Record<string, RoadState>;
  blockedEdgeIds: string[];
  degradedEdgeIds: string[];
  villages: Record<string, DisasterVillage>;
  counts: { isolated: number; atRisk: number; exposed: number; affected: number };
  population: { isolated: number; atRisk: number; exposed: number; affected: number; delayed: number };
  medical: {
    risk: MedicalRisk;
    cutOff: number;
    delayed: number;
    avgExtraKm: number | null;
    worstVillageId: string | null;
  };
  supply: {
    roadsImpacted: number;
    linesImpacted: number;
    byGood: Record<GoodId, number>;
    depotsImpacted: string[];
  };
  districts: Record<string, DistrictScore>;
  alerts: DisasterAlert[];
}

export interface Scenario {
  config: ScenarioConfig;
  districtName: string;
  epicentre: LatLng;
  snapped: boolean;
  snapDistanceKm: number;
  snappedRoadName: string | null;
  finalRadiusKm: number;
  steps: StepResult[];
}

export interface Decision {
  priority: "Immediate" | "Within 12 hours" | "Within 24 hours";
  title: string;
  detail: string;
}
