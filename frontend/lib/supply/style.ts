import type { SupplyRisk } from "./model";

export const SUPPLY_RISK_STYLE: Record<SupplyRisk, { color: string; ink: string }> = {
  Low: { color: "#3f8f5f", ink: "#2b6b45" },
  Medium: { color: "#d1a91b", ink: "#7a6208" },
  High: { color: "#e2842a", ink: "#9a4f0c" },
  Critical: { color: "#c0392b", ink: "#9b2a1e" },
};
