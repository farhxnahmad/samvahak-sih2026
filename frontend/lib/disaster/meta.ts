import type { DisasterType, Severity } from "./types";

export interface TypeInfo {
  label: string;
  blurb: string;
  // Radius of the hazard zone at 48 hours, in km, for severity 1 to 4.
  radiusKm: [number, number, number, number];
  // Share of the 48 hour radius already reached at hour 0.
  startShare: number;
  // Share of the radius, from the centre, where roads are fully blocked. The rest is degraded.
  blockShare: number;
  // Placed on the nearest modelled road instead of the district centre.
  snapsToRoad: boolean;
  color: string;
}

// SAMPLE PARAMETERS. Tune with hazard agency guidance.
export const TYPE_INFO: Record<DisasterType, TypeInfo> = {
  flood: {
    label: "Flood",
    blurb: "River and surface flooding. Blocks low-lying roads, slows hill roads.",
    radiusKm: [25, 45, 75, 110],
    startShare: 0.3,
    blockShare: 0.75,
    snapsToRoad: false,
    color: "#2b7fa8",
  },
  landslide: {
    label: "Landslide",
    blurb: "Slope failure on the nearest road. Blocks a stretch and spreads outward.",
    radiusKm: [8, 14, 22, 35],
    startShare: 0.6,
    blockShare: 1,
    snapsToRoad: true,
    color: "#8a5a2b",
  },
  bridge: {
    label: "Bridge collapse",
    blurb: "A bridge fails on the nearest road. The road is cut at that point.",
    radiusKm: [2, 3, 4, 6],
    startShare: 1,
    blockShare: 1,
    snapsToRoad: true,
    color: "#b0432f",
  },
  blockage: {
    label: "Road blockage",
    blurb: "Debris, an accident or a protest blocks the nearest road.",
    radiusKm: [4, 7, 12, 20],
    startShare: 0.8,
    blockShare: 1,
    snapsToRoad: true,
    color: "#a8501f",
  },
  rainfall: {
    label: "Extreme rainfall",
    blurb: "Widespread heavy rain. Slows roads across the area and triggers slides on hill roads.",
    radiusKm: [40, 70, 110, 160],
    startShare: 0.4,
    blockShare: 0.35,
    snapsToRoad: false,
    color: "#4f6d8a",
  },
};

export const TYPE_ORDER: DisasterType[] = ["flood", "landslide", "bridge", "blockage", "rainfall"];

export const SEVERITY_LABEL: Record<Severity, string> = {
  1: "Minor",
  2: "Moderate",
  3: "Severe",
  4: "Extreme",
};

// Travel cost multiplier on degraded roads, by severity.
export const DEGRADE_MULT: Record<Severity, number> = { 1: 1.3, 2: 1.5, 3: 1.8, 4: 2.2 };

// Extra accessibility risk points added at the centre of the hazard zone, by severity.
export const RISK_BOOST: Record<Severity, number> = { 1: 10, 2: 20, 3: 32, 4: 45 };

export const HILLY_STATES = new Set([
  "Meghalaya",
  "Arunachal Pradesh",
  "Sikkim",
  "Nagaland",
  "Manipur",
  "Mizoram",
]);

export function radiusAt(type: DisasterType, severity: Severity, hour: number): number {
  const info = TYPE_INFO[type];
  const full = info.radiusKm[severity - 1];
  const t = Math.min(1, Math.max(0, hour / 48));
  return full * (info.startShare + (1 - info.startShare) * Math.pow(t, 0.7));
}
