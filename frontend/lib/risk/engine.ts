import type { LatLng } from "../types";
import { DISTRICT_INPUTS, STATE_OUTLOOK, type DistrictInput } from "./districts";
import {
  FACTOR_KEYS,
  categoryOf,
  clamp,
  computeScore,
  mainFactorOf,
  trendOf,
  type FactorKey,
  type FactorScores,
  type RiskCategory,
  type Trend,
} from "./model";

export const HORIZONS = [0, 24, 48, 72] as const;
export type Horizon = (typeof HORIZONS)[number];

const STEP: Record<Horizon, number> = { 0: 0, 24: 1, 48: 2, 72: 3 };
const UNCERTAINTY: Record<Horizon, number> = { 0: 0, 24: 4, 48: 7, 72: 10 };

export interface ForecastPoint {
  horizon: Horizon;
  score: number;
  low: number;
  high: number;
  category: RiskCategory;
}

export interface DistrictRisk {
  id: string;
  name: string;
  state: string;
  pos: LatLng;
  factors: FactorScores;
  previous: FactorScores;
  score: number;
  previousScore: number;
  changePct: number;
  trend: Trend;
  category: RiskCategory;
  mainFactor: FactorKey;
  forecast: ForecastPoint[];
}

function pct(now: number, before: number): number {
  if (before <= 0) return 0;
  return Math.round(((now - before) / before) * 100);
}

// Projects the four factors forward. Weather follows the state outlook, incidents
// and congestion react to weather, and incidents clear a little over time.
function project(factors: FactorScores, state: string, horizon: Horizon): FactorScores {
  if (horizon === 0) return factors;
  const step = STEP[horizon];
  const outlook = STATE_OUTLOOK[state] ?? [0, 0, 0];
  const weather = clamp(factors.weather + outlook[step - 1]);
  const weatherChange = weather - factors.weather;
  return {
    weather,
    incidents: clamp(factors.incidents + 0.35 * weatherChange - 3 * step),
    congestion: clamp(factors.congestion + 0.2 * weatherChange),
    history: factors.history,
  };
}

function toRisk(input: DistrictInput): DistrictRisk {
  const factors: FactorScores = {
    weather: input.weather,
    incidents: input.incidents,
    congestion: input.congestion,
    history: input.history,
  };
  const previous: FactorScores = { ...factors };
  for (const key of FACTOR_KEYS) {
    previous[key] = clamp(factors[key] - (input.shift[key] ?? 0));
  }

  const score = computeScore(factors);
  const previousScore = computeScore(previous);
  const changePct = pct(score, previousScore);

  const forecast: ForecastPoint[] = HORIZONS.map((horizon) => {
    const s = computeScore(project(factors, input.state, horizon));
    const spread = UNCERTAINTY[horizon];
    return {
      horizon,
      score: s,
      low: Math.round(clamp(s - spread)),
      high: Math.round(clamp(s + spread)),
      category: categoryOf(s),
    };
  });

  return {
    id: input.id,
    name: input.name,
    state: input.state,
    pos: input.pos,
    factors,
    previous,
    score,
    previousScore,
    changePct,
    trend: trendOf(changePct),
    category: categoryOf(score),
    mainFactor: mainFactorOf(factors),
    forecast,
  };
}

export function buildDistrictRisks(inputs: DistrictInput[]): DistrictRisk[] {
  return inputs.map(toRisk);
}

export const DISTRICT_RISKS: DistrictRisk[] = buildDistrictRisks(DISTRICT_INPUTS);

export function forecastAt(district: DistrictRisk, horizon: Horizon): ForecastPoint {
  return district.forecast.find((p) => p.horizon === horizon) ?? district.forecast[0];
}

export function scoreAt(district: DistrictRisk, horizon: Horizon): number {
  return forecastAt(district, horizon).score;
}

// Now: change versus 24 hours ago. Future horizons: change versus now.
export function changeAt(district: DistrictRisk, horizon: Horizon): number {
  if (horizon === 0) return district.changePct;
  return pct(scoreAt(district, horizon), district.score);
}

export function horizonLabel(horizon: Horizon): string {
  return horizon === 0 ? "Now" : `${horizon}h`;
}
