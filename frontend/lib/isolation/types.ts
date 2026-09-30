import type { LatLng } from "../types";

export interface RoadEdge {
  id: string;
  name: string;
  corridorId: string;
  from: string;
  to: string;
  lengthKm: number;
  path: LatLng[];
}

export type FacilityKind = "healthcare" | "supply";

export interface Facility {
  id: string;
  name: string;
  kind: FacilityKind;
  nodeId: string;
  pos: LatLng;
}

export interface AltLink {
  nodeId: string;
  km: number;
  name: string;
}

export interface Village {
  id: string;
  name: string;
  district: string;
  state: string;
  population: number;
  roadId: string;
  at: number;
  spurKm: number;
  alt: AltLink | null;
  pos: LatLng;
  connectedRoads: { id: string; name: string }[];
  healthcareId: string;
  healthcareKm: number;
  supplyId: string;
  supplyKm: number;
}

export interface Blockage {
  edgeId: string;
  startKm: number;
  endKm: number;
}

export type VillageState = "other" | "connected" | "at-risk" | "isolated";
export type Emergency = "accessible" | "delayed" | "cut-off";
export type MedicalRisk = "Low" | "Moderate" | "High" | "Critical";

export interface VillageImpact {
  villageId: string;
  state: VillageState;
  emergency: Emergency;
  healthBaseKm: number;
  healthAfterKm: number | null;
  healthFacilityId: string | null;
  supplyBaseKm: number;
  supplyAfterKm: number | null;
  nearestAlternativeKm: number;
  reason: string;
}

export interface Detour {
  nodeIds: string[];
  edgeIds: string[];
  km: number;
  extraKm: number;
}

export interface SimulationResult {
  blockage: Blockage;
  edge: RoadEdge;
  impacts: VillageImpact[];
  byId: Record<string, VillageImpact>;
  isolatedCount: number;
  atRiskCount: number;
  reroutedCount: number;
  affectedCount: number;
  populationIsolated: number;
  populationAtRisk: number;
  populationImpacted: number;
  populationDelayed: number;
  medicalRisk: MedicalRisk;
  detour: Detour | null;
  nearestAlternativeKm: number | null;
}
