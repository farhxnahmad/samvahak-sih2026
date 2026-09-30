import { corridors, hubById, incidents } from "../data";
import { haversineKm } from "../geo";
import { nearestOnPath } from "../isolation/geometry";
import { EDGES } from "../isolation/network";
import { STATE_OUTLOOK } from "../risk/districts";
import { DISTRICT_RISKS } from "../risk/engine";
import { clamp } from "../risk/model";
import type { Corridor, CorridorStatus, Incident, LatLng } from "../types";
import type { RoadEdge } from "../isolation/types";

// The four context feeds the co-pilot reads: weather, route status, incident reports, risk scores.
// In this prototype all four are sample data from the platform's own modules.

export const CORRIDOR_BY_ID: Record<string, Corridor> = Object.fromEntries(
  corridors.map((c): [string, Corridor] => [c.id, c])
);

export interface EdgeContext {
  edge: RoadEdge;
  status: CorridorStatus;
  incidents: Incident[];
  areaScore: number;
  areaDistrict: string;
  weather: number;
  risk: number;
  states: string[];
}

const STATUS_POINTS: Record<CorridorStatus, number> = { clear: 0, caution: 25, disrupted: 70 };

// Each incident belongs to the road segment nearest to it within its corridor.
const INCIDENT_EDGE: Record<string, string> = {};
for (const inc of incidents) {
  let best = Infinity;
  for (const edge of EDGES) {
    if (edge.corridorId !== inc.corridorId) continue;
    const d = nearestOnPath(inc.pos, edge.path).distKm;
    if (d < best) {
      best = d;
      INCIDENT_EDGE[inc.id] = edge.id;
    }
  }
}

function buildEdgeContext(edge: RoadEdge): EdgeContext {
  const status = CORRIDOR_BY_ID[edge.corridorId]?.status ?? "clear";
  const edgeIncidents = incidents.filter((i) => INCIDENT_EDGE[i.id] === edge.id);

  let areaScore = 0;
  let areaDistrict = "";
  let weather = 0;
  for (const d of DISTRICT_RISKS) {
    if (nearestOnPath(d.pos, edge.path).distKm > 40) continue;
    if (d.score > areaScore) {
      areaScore = d.score;
      areaDistrict = d.name;
    }
    weather = Math.max(weather, d.factors.weather);
  }

  const incidentPts = Math.min(30, edgeIncidents.length * 12);
  const areaRisk = clamp((areaScore - 35) * 0.7, 0, 40);
  const weatherRisk = clamp((weather - 50) * 0.6, 0, 25);
  const risk = Math.round(clamp(STATUS_POINTS[status] + incidentPts + 0.6 * areaRisk + 0.5 * weatherRisk));

  return {
    edge,
    status,
    incidents: edgeIncidents,
    areaScore,
    areaDistrict,
    weather,
    risk,
    states: Array.from(new Set([hubById[edge.from].state, hubById[edge.to].state])),
  };
}

export const EDGE_CONTEXT: Record<string, EdgeContext> = Object.fromEntries(
  EDGES.map((e): [string, EdgeContext] => [e.id, buildEdgeContext(e)])
);

export const DISRUPTED_EDGE_IDS = EDGES.filter((e) => EDGE_CONTEXT[e.id].status === "disrupted").map((e) => e.id);
export const CAUTION_EDGE_IDS = EDGES.filter((e) => EDGE_CONTEXT[e.id].status === "caution").map((e) => e.id);

export function weatherLabel(severity: number): string {
  if (severity >= 75) return "severe rain";
  if (severity >= 55) return "heavy rain";
  if (severity >= 35) return "moderate rain";
  return "light conditions";
}

// Largest expected rise in weather severity within 72 hours, by state.
export function weatherPeak(state: string): { hours: number; delta: number } {
  const outlook = STATE_OUTLOOK[state] ?? [0, 0, 0];
  let best = { hours: 24, delta: outlook[0] };
  outlook.forEach((delta, i) => {
    if (delta > best.delta) best = { hours: (i + 1) * 24, delta };
  });
  return best;
}

export function nearestEdgeContext(pos: LatLng): { ctx: EdgeContext; km: number } {
  let best: { ctx: EdgeContext; km: number } | null = null;
  for (const edge of EDGES) {
    const km = nearestOnPath(pos, edge.path).distKm;
    if (best === null || km < best.km) best = { ctx: EDGE_CONTEXT[edge.id], km };
  }
  return best as { ctx: EdgeContext; km: number };
}

export function nearbyIncident(pos: LatLng, withinKm: number): Incident | null {
  let best: { inc: Incident; km: number } | null = null;
  for (const inc of incidents) {
    const km = haversineKm(pos, inc.pos);
    if (km <= withinKm && (best === null || km < best.km)) best = { inc, km };
  }
  return best ? best.inc : null;
}

export function hoursLabel(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m} min`;
  if (m === 0 || h >= 10) return `${Math.round(hours)} h`;
  return `${h} h ${m} min`;
}
