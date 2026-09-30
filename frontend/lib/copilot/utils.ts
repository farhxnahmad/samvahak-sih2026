import type { Bounds, LatLng } from "../types";
import type { RiskCategory } from "../risk/model";
import type { ContextItem, FeedId, Level, MapHighlight } from "./types";

export function levelFromRisk(risk: number): Level {
  if (risk < 25) return "Low";
  if (risk < 45) return "Moderate";
  if (risk < 65) return "High";
  return "Critical";
}

export function levelFromCategory(category: RiskCategory): Level {
  return { low: "Low", moderate: "Moderate", high: "High", critical: "Critical" }[category] as Level;
}

export function boundsOfPoints(points: LatLng[], pad = 0.25): Bounds | null {
  if (points.length === 0) return null;
  const lats = points.map((p) => p[0]);
  const lngs = points.map((p) => p[1]);
  return [
    [Math.min(...lats) - pad, Math.min(...lngs) - pad],
    [Math.max(...lats) + pad, Math.max(...lngs) + pad],
  ];
}

export const FEED_LABEL: Record<FeedId, string> = {
  weather: "Weather",
  routes: "Route status",
  incidents: "Incident reports",
  risk: "Risk scores",
};

const FEED_ORDER: FeedId[] = ["weather", "routes", "incidents", "risk"];

export function buildContext(details: Partial<Record<FeedId, string>>): ContextItem[] {
  return FEED_ORDER.map((feed) => {
    const detail = details[feed];
    return { feed, used: detail !== undefined, detail: detail ?? "Not needed for this question." };
  });
}

export function emptyMap(key: string): MapHighlight {
  return { key, routes: [], points: [], bounds: null };
}

export function plainList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}
