import { corridors, hubById } from "../data";
import { pathLengthKm } from "../geo";
import type { LatLng } from "../types";
import type { Facility, RoadEdge } from "./types";

function samePos(a: LatLng, b: LatLng): boolean {
  return a[0] === b[0] && a[1] === b[1];
}

// Road segments are the stretches of each road corridor between two hubs.
function buildEdges(): RoadEdge[] {
  const edges: RoadEdge[] = [];
  corridors
    .filter((c) => c.mode === "road")
    .forEach((c) => {
      const marks: { idx: number; hub: string }[] = [];
      c.hubIds.forEach((hub) => {
        const idx = c.path.findIndex((p) => samePos(p, hubById[hub].pos));
        if (idx >= 0) marks.push({ idx, hub });
      });
      marks.sort((a, b) => a.idx - b.idx);
      for (let i = 1; i < marks.length; i += 1) {
        const a = marks[i - 1];
        const b = marks[i];
        const path = c.path.slice(a.idx, b.idx + 1);
        edges.push({
          id: `${c.id}:${a.hub}-${b.hub}`,
          name: `${hubById[a.hub].name} to ${hubById[b.hub].name}`,
          corridorId: c.id,
          from: a.hub,
          to: b.hub,
          // Straight-line length of the waypoints, scaled up for road winding.
          lengthKm: Math.max(1, Math.round(pathLengthKm(path) * 1.2 * 10) / 10),
          path,
        });
      }
    });
  return edges;
}

export const EDGES: RoadEdge[] = buildEdges();
export const EDGE_BY_ID: Record<string, RoadEdge> = Object.fromEntries(
  EDGES.map((e): [string, RoadEdge] => [e.id, e])
);

const HEALTHCARE_HUBS = [
  "guwahati", "shillong", "silchar", "tura", "imphal", "kohima", "aizawl", "agartala",
  "itanagar", "gangtok", "dibrugarh", "tezpur", "dimapur", "jorhat", "siliguri",
];
const SUPPLY_HUBS = [
  "guwahati", "shillong", "silchar", "tura", "imphal", "aizawl", "agartala", "dimapur",
  "siliguri", "dibrugarh", "itanagar",
];

export const FACILITIES: Facility[] = [
  ...HEALTHCARE_HUBS.map(
    (hub): Facility => ({
      id: `hc-${hub}`,
      name: `District hospital, ${hubById[hub].name}`,
      kind: "healthcare",
      nodeId: hub,
      pos: hubById[hub].pos,
    })
  ),
  ...SUPPLY_HUBS.map(
    (hub): Facility => ({
      id: `sp-${hub}`,
      name: `Supply depot, ${hubById[hub].name}`,
      kind: "supply",
      nodeId: hub,
      pos: hubById[hub].pos,
    })
  ),
];

export const FACILITY_BY_ID: Record<string, Facility> = Object.fromEntries(
  FACILITIES.map((f): [string, Facility] => [f.id, f])
);

interface Link {
  to: string;
  km: number;
  edgeId: string;
}

function adjacencyFor(blocked: ReadonlySet<string>): Map<string, Link[]> {
  const adj = new Map<string, Link[]>();
  const add = (a: string, b: string, km: number, edgeId: string) => {
    const list = adj.get(a) ?? [];
    list.push({ to: b, km, edgeId });
    adj.set(a, list);
  };
  for (const e of EDGES) {
    if (blocked.has(e.id)) continue;
    add(e.from, e.to, e.lengthKm, e.id);
    add(e.to, e.from, e.lengthKm, e.id);
  }
  return adj;
}

export interface Tree {
  dist: Map<string, number>;
  prev: Map<string, { node: string; edgeId: string }>;
}

export function dijkstra(source: string, blocked: ReadonlySet<string>): Tree {
  const adj = adjacencyFor(blocked);
  const dist = new Map<string, number>([[source, 0]]);
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
      const nd = best + link.km;
      const known = dist.get(link.to);
      if (known === undefined || nd < known) {
        dist.set(link.to, nd);
        prev.set(link.to, { node: current, edgeId: link.edgeId });
      }
    }
  }
  return { dist, prev };
}

export function edgesToSource(tree: Tree, node: string): string[] {
  const out: string[] = [];
  let cur = node;
  for (;;) {
    const p = tree.prev.get(cur);
    if (!p) break;
    out.push(p.edgeId);
    cur = p.node;
  }
  return out;
}

export function treesFor(blocked: ReadonlySet<string>): Record<string, Tree> {
  const trees: Record<string, Tree> = {};
  for (const f of FACILITIES) {
    trees[f.id] = dijkstra(f.nodeId, blocked);
  }
  return trees;
}

export interface RoutePath {
  km: number;
  nodeIds: string[];
  edgeIds: string[];
}

export function pathBetween(
  source: string,
  target: string,
  blocked: ReadonlySet<string>
): RoutePath | null {
  const tree = dijkstra(source, blocked);
  const km = tree.dist.get(target);
  if (km === undefined) return null;
  const nodeIds = [target];
  const edgeIds: string[] = [];
  let cur = target;
  while (cur !== source) {
    const p = tree.prev.get(cur);
    if (!p) break;
    edgeIds.push(p.edgeId);
    nodeIds.push(p.node);
    cur = p.node;
  }
  return { km, nodeIds: nodeIds.reverse(), edgeIds: edgeIds.reverse() };
}
