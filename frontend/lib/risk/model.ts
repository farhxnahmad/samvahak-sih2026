export type FactorKey = "weather" | "incidents" | "congestion" | "history";
export type FactorScores = Record<FactorKey, number>;

export const FACTOR_KEYS: FactorKey[] = ["weather", "incidents", "congestion", "history"];

export const FACTOR_LABEL: Record<FactorKey, string> = {
  weather: "Weather severity",
  incidents: "Road incidents",
  congestion: "Route congestion",
  history: "Historical disruption",
};

// Weights sum to 1. Each factor is scored 0-100 before weighting.
export const WEIGHTS: Record<FactorKey, number> = {
  weather: 0.35,
  incidents: 0.25,
  congestion: 0.2,
  history: 0.2,
};

export type RiskCategory = "low" | "moderate" | "high" | "critical";
export type Trend = "up" | "down" | "steady";

export const CATEGORY_KEYS: RiskCategory[] = ["low", "moderate", "high", "critical"];

export const CATEGORY: Record<
  RiskCategory,
  { label: string; range: string; color: string; ink: string }
> = {
  low: { label: "Low", range: "0-30", color: "#3f8f5f", ink: "#2b6b45" },
  moderate: { label: "Moderate", range: "31-60", color: "#d1a91b", ink: "#7a6208" },
  high: { label: "High", range: "61-80", color: "#e2842a", ink: "#9a4f0c" },
  critical: { label: "Critical", range: "81-100", color: "#c0392b", ink: "#9b2a1e" },
};

export function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

export function computeScore(factors: FactorScores): number {
  let total = 0;
  for (const key of FACTOR_KEYS) {
    total += WEIGHTS[key] * factors[key];
  }
  return Math.round(clamp(total));
}

export function categoryOf(score: number): RiskCategory {
  const s = Math.round(score);
  if (s <= 30) return "low";
  if (s <= 60) return "moderate";
  if (s <= 80) return "high";
  return "critical";
}

export function trendOf(changePct: number): Trend {
  if (changePct >= 3) return "up";
  if (changePct <= -3) return "down";
  return "steady";
}

// The factor that adds the most points to the score.
export function mainFactorOf(factors: FactorScores): FactorKey {
  let best: FactorKey = "weather";
  let bestPoints = -1;
  for (const key of FACTOR_KEYS) {
    const points = WEIGHTS[key] * factors[key];
    if (points > bestPoints) {
      best = key;
      bestPoints = points;
    }
  }
  return best;
}

export function pointsOf(factors: FactorScores, key: FactorKey): number {
  return Math.round(WEIGHTS[key] * factors[key]);
}

// Continuous green, yellow, orange, red scale used by the heatmap.
const STOPS: { at: number; rgb: [number, number, number] }[] = [
  { at: 0, rgb: [63, 143, 95] },
  { at: 40, rgb: [214, 183, 39] },
  { at: 65, rgb: [226, 132, 42] },
  { at: 100, rgb: [192, 57, 43] },
];

export function scoreColor(score: number): string {
  const s = clamp(score);
  for (let i = 1; i < STOPS.length; i += 1) {
    const a = STOPS[i - 1];
    const b = STOPS[i];
    if (s <= b.at) {
      const t = (s - a.at) / (b.at - a.at);
      const r = Math.round(a.rgb[0] + (b.rgb[0] - a.rgb[0]) * t);
      const g = Math.round(a.rgb[1] + (b.rgb[1] - a.rgb[1]) * t);
      const bl = Math.round(a.rgb[2] + (b.rgb[2] - a.rgb[2]) * t);
      return `rgb(${r}, ${g}, ${bl})`;
    }
  }
  const last = STOPS[STOPS.length - 1].rgb;
  return `rgb(${last[0]}, ${last[1]}, ${last[2]})`;
}
