import type { Confidence } from "./types";

export interface Adjustment {
  label: string;
  delta: number;
}

// Confidence is a starting value for the kind of answer, adjusted for how much of the
// answer rests on data the prototype does not model or on forecasts.
export function confidence(base: number, adjustments: Adjustment[], basis: string[]): Confidence {
  const value = Math.round(Math.min(96, Math.max(20, base + adjustments.reduce((s, a) => s + a.delta, 0))));
  const label: Confidence["label"] = value >= 75 ? "High" : value >= 55 ? "Medium" : "Low";
  return {
    value,
    label,
    basis: [...basis, ...adjustments.map((a) => `${a.delta > 0 ? "+" : ""}${a.delta}: ${a.label}`)],
  };
}
