import { EDGES, EDGE_BY_ID } from "../isolation/network";
import type { Incident, LatLng } from "../types";
import { EDGE_CONTEXT } from "./context";

export const ROAD_SPEED_KMH = 35;

export interface PlannedRoute {
  nodeIds: string[];
  edgeIds: string[];
  km: number;
  hours: number;
  riskIndex: number;
  worst: { edgeId: string; risk: number } | null;
  incidents: Incident[];
  states: string[];
}

interface Link {
  to: string;
  edgeId: string;
  cost: number;
}

// Cheapest route between two hubs. "fast" minimises distance. "safe" multiplies each road's
// length by its risk, so a risky road has to be much shorter to be chosen.
export function planRoute(
  from: string,
  to: string,
  mode: "safe" | "fast",
  exclude: ReadonlySet<string> = new Set()
): PlannedRoute | null {
  const adj = new Map<string, Link[]>();
  for (const e of EDGES) {
    if (exclude.has(e.id)) continue;
    const cost = mode === "fast" ? e.lengthKm : e.lengthKm * (1 + EDGE_CONTEXT[e.id].risk / 40);
    adj.set(e.from, [...(adj.get(e.from) ?? []), { to: e.to, edgeId: e.id, cost }]);
    adj.set(e.to, [...(adj.get(e.to) ?? []), { to: e.from, edgeId: e.id, cost }]);
  }

  const dist = new Map<string, number>([[from, 0]]);
  const prev = new Map<string, { node: string; edgeId: string }>();
  const done = new Set<string>();
  for (;;) {
    let current = "";
    let best = Infinity;
    for (const [node, d] of dist) {
      if (!done.has(node) && d < best) {
        best = d;
        current = node;
      }
    }
    if (current === "") break;
    done.add(current);
    for (const link of adj.get(current) ?? []) {
      const nd = best + link.cost;
      const known = dist.get(link.to);
      if (known === undefined || nd < known) {
        dist.set(link.to, nd);
        prev.set(link.to, { node: current, edgeId: link.edgeId });
      }
    }
  }
  if (!dist.has(to)) return null;

  const nodeIds = [to];
  const edgeIds: string[] = [];
  let cur = to;
  while (cur !== from) {
    const p = prev.get(cur);
    if (!p) return null;
    edgeIds.push(p.edgeId);
    nodeIds.push(p.node);
    cur = p.node;
  }
  nodeIds.reverse();
  edgeIds.reverse();

  let km = 0;
  let weighted = 0;
  let worst: PlannedRoute["worst"] = null;
  const incidents: Incident[] = [];
  const states = new Set<string>();
  for (const id of edgeIds) {
    const ctx = EDGE_CONTEXT[id];
    km += ctx.edge.lengthKm;
    weighted += ctx.edge.lengthKm * ctx.risk;
    if (worst === null || ctx.risk > worst.risk) worst = { edgeId: id, risk: ctx.risk };
    incidents.push(...ctx.incidents);
    ctx.states.forEach((s) => states.add(s));
  }

  return {
    nodeIds,
    edgeIds,
    km: Math.round(km),
    hours: km / ROAD_SPEED_KMH,
    riskIndex: km > 0 ? Math.round(weighted / km) : 0,
    worst,
    incidents,
    states: Array.from(states),
  };
}

// The route drawn as one polyline, each segment oriented along the direction of travel.
export function routePath(route: PlannedRoute): LatLng[] {
  const out: LatLng[] = [];
  route.edgeIds.forEach((id, i) => {
    const edge = EDGE_BY_ID[id];
    const forward = edge.from === route.nodeIds[i];
    const path = forward ? edge.path : [...edge.path].reverse();
    out.push(...(i === 0 ? path : path.slice(1)));
  });
  return out;
}
