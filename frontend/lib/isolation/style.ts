import type { MedicalRisk, VillageState } from "./types";

export const VILLAGE_STYLE: Record<VillageState, { label: string; color: string; ink: string }> = {
  other: { label: "Not affected", color: "#a89670", ink: "#6b5d3f" },
  connected: { label: "Connected", color: "#2b7fa8", ink: "#1c5673" },
  "at-risk": { label: "At risk", color: "#e2842a", ink: "#9a4f0c" },
  isolated: { label: "Isolated", color: "#b0432f", ink: "#96331f" },
};

export const MEDICAL_STYLE: Record<MedicalRisk, { color: string; ink: string }> = {
  Low: { color: "#3f8f5f", ink: "#2b6b45" },
  Moderate: { color: "#d1a91b", ink: "#7a6208" },
  High: { color: "#e2842a", ink: "#9a4f0c" },
  Critical: { color: "#c0392b", ink: "#9b2a1e" },
};

export const BLOCKED_COLOR = "#b0432f";
export const ROUTE_B_COLOR = "#2b7fa8";
