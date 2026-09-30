import { EDGE_BY_ID, EDGES, dijkstra, edgesToSource, pathBetween, type Tree } from "../isolation/network";
import { DEPOTS, DEPOT_BY_ID } from "./depots";
import { GOODS, GOOD_BY_ID, GOOD_IDS, type GoodId } from "./goods";

export type SupplyRisk = "Low" | "Medium" | "High" | "Critical";
export const RISK_ORDER: SupplyRisk[] = ["Low", "Medium", "High", "Critical"];

// Tunable assumptions.
export const SPEED_KMH = 35; // average truck speed on hill roads, stops included
export const DISPATCH_HOURS = 6; // time to arrange a rerouted or transfer dispatch
export const CAP_REROUTE = 0.7; // share of normal inflow a detour can carry
export const CAP_TRANSFER = 0.4; // share of normal inflow a depot-to-depot transfer can carry
export const CATCHUP = 1.5; // inflow multiplier while clearing the backlog after reopening
export const HORIZON_HOURS = 168;
export const TIMELINE_HOURS = [12, 24, 48, 72] as const;

export interface SupplyLine {
  goodId: GoodId;
  depotId: string;
  sourceId: string;
  self: boolean;
  km: number;
  nodeIds: string[];
  edgeIds: string[];
}

const EMPTY = new Set<string>();
const sourceTrees: Record<string, Tree> = {};
function treeFor(source: string): Tree {
  if (!sourceTrees[source]) sourceTrees[source] = dijkstra(source, EMPTY);
  return sourceTrees[source];
}

function pathFromTree(tree: Tree, target: string): { nodeIds: string[]; edgeIds: string[] } {
  const nodeIds = [target];
  const edgeIds: string[] = [];
  let cur = target;
  for (;;) {
    const p = tree.prev.get(cur);
    if (!p) break;
    edgeIds.push(p.edgeId);
    nodeIds.push(p.node);
    cur = p.node;
  }
  return { nodeIds: nodeIds.reverse(), edgeIds: edgeIds.reverse() };
}

function buildLines(): SupplyLine[] {
  const lines: SupplyLine[] = [];
  for (const good of GOODS) {
    for (const depot of DEPOTS) {
      if (good.sources.includes(depot.id)) {
        lines.push({ goodId: good.id, depotId: depot.id, sourceId: depot.id, self: true, km: 0, nodeIds: [depot.id], edgeIds: [] });
        continue;
      }
      let bestSource = "";
      let bestKm = Infinity;
      for (const s of good.sources) {
        const d = treeFor(s).dist.get(depot.id);
        if (d !== undefined && d < bestKm) {
          bestKm = d;
          bestSource = s;
        }
      }
      if (bestSource === "") continue;
      const path = pathFromTree(treeFor(bestSource), depot.id);
      lines.push({ goodId: good.id, depotId: depot.id, sourceId: bestSource, self: false, km: bestKm, ...path });
    }
  }
  return lines;
}

// Supply route mapping: which source feeds each depot, for each good, and by which roads.
export const LINES: SupplyLine[] = buildLines();

export function lineKey(goodId: GoodId, depotId: string): string {
  return `${goodId}:${depotId}`;
}

export const LINE_BY_KEY: Record<string, SupplyLine> = Object.fromEntries(
  LINES.map((l): [string, SupplyLine] => [lineKey(l.goodId, l.depotId), l])
);

// Number of depots each road feeds, per good.
export const ROUTE_USAGE: Record<GoodId, Record<string, number>> = {
  medicine: {}, food: {}, lpg: {}, fuel: {}, relief: {},
};
// Lines that depend on each road.
export const LINES_BY_EDGE: Record<string, SupplyLine[]> = {};
EDGES.forEach((e) => {
  LINES_BY_EDGE[e.id] = [];
});
LINES.forEach((l) => {
  l.edgeIds.forEach((id) => {
    ROUTE_USAGE[l.goodId][id] = (ROUTE_USAGE[l.goodId][id] ?? 0) + 1;
    LINES_BY_EDGE[id]?.push(l);
  });
});

export interface SupplyOption {
  kind: "reroute" | "transfer";
  fromId: string;
  nodeIds: string[];
  edgeIds: string[];
  km: number;
  extraKm: number;
  leadHours: number;
  cap: number;
}

export interface LineImpact {
  goodId: GoodId;
  depotId: string;
  affected: boolean;
  risk: SupplyRisk;
  normalStock: number;
  dailyUse: number;
  safePct: number;
  seriesPct: number[];
  hoursToThreshold: number | null;
  hoursToStockout: number | null;
  delayHours: number;
  delayedShipments: number;
  baseline: { sourceId: string; km: number };
  chosen: SupplyOption | null;
  options: SupplyOption[];
}

export interface GoodSummary {
  goodId: GoodId;
  risk: SupplyRisk;
  affectedDepots: number;
  belowSafeSoon: number;
  stockouts: number;
  people: number;
  earliest: { depotId: string; hours: number } | null;
}

export interface SupplyAnalysis {
  edgeId: string;
  closureHours: number;
  items: LineImpact[];
  byGood: Record<GoodId, GoodSummary>;
  overallRisk: SupplyRisk;
  affectedDepotIds: string[];
  people: number;
  delayedShipments: number;
  avgDelayHours: number;
}

export function impactOf(analysis: SupplyAnalysis, goodId: GoodId, depotId: string): LineImpact | undefined {
  return analysis.items.find((i) => i.goodId === goodId && i.depotId === depotId);
}

function riskFor(thresholdHour: number | null, stockoutHour: number | null): SupplyRisk {
  if (stockoutHour !== null && stockoutHour <= 72) return "Critical";
  if (thresholdHour !== null && thresholdHour <= 48) return "High";
  if (thresholdHour !== null && thresholdHour <= 96) return "Medium";
  return "Low";
}

function worst(a: SupplyRisk, b: SupplyRisk): SupplyRisk {
  return RISK_ORDER.indexOf(a) >= RISK_ORDER.indexOf(b) ? a : b;
}

interface Alternatives {
  reroute: SupplyOption | null;
  transfer: SupplyOption | null;
}

const altCache = new Map<string, Alternatives>();

function alternativesFor(edgeIds: string[], line: SupplyLine, affectedKeys: Set<string>): Alternatives {
  const key = `${edgeIds.join(",")}|${lineKey(line.goodId, line.depotId)}`;
  const cached = altCache.get(key);
  if (cached) return cached;

  const blocked = new Set<string>(edgeIds);
  const good = GOOD_BY_ID[line.goodId];

  let reroute: SupplyOption | null = null;
  for (const s of good.sources) {
    if (s === line.depotId) continue;
    const p = pathBetween(s, line.depotId, blocked);
    if (p && (reroute === null || p.km < reroute.km)) {
      reroute = {
        kind: "reroute",
        fromId: s,
        nodeIds: p.nodeIds,
        edgeIds: p.edgeIds,
        km: Math.round(p.km),
        extraKm: Math.round(p.km - line.km),
        leadHours: DISPATCH_HOURS + p.km / SPEED_KMH,
        cap: CAP_REROUTE,
      };
    }
  }

  let transfer: SupplyOption | null = null;
  for (const other of DEPOTS) {
    if (other.id === line.depotId) continue;
    if (affectedKeys.has(lineKey(line.goodId, other.id))) continue;
    if (other.cover[line.goodId] < good.safeDays * 1.5) continue;
    const p = pathBetween(other.id, line.depotId, blocked);
    if (p && (transfer === null || p.km < transfer.km)) {
      transfer = {
        kind: "transfer",
        fromId: other.id,
        nodeIds: p.nodeIds,
        edgeIds: p.edgeIds,
        km: Math.round(p.km),
        extraKm: 0,
        leadHours: DISPATCH_HOURS + p.km / SPEED_KMH,
        cap: CAP_TRANSFER,
      };
    }
  }

  const result = { reroute, transfer };
  altCache.set(key, result);
  return result;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// One road, or several roads closed at once.
export function analyse(edge: string | string[], closureHours: number): SupplyAnalysis {
  const closedIds = Array.isArray(edge) ? edge : [edge];
  const edgeId = closedIds[0] ?? "";
  const affectedKeys = new Set<string>();
  for (const id of closedIds) {
    for (const l of LINES_BY_EDGE[id] ?? []) affectedKeys.add(lineKey(l.goodId, l.depotId));
  }

  const items: LineImpact[] = LINES.map((line) => {
    const good = GOOD_BY_ID[line.goodId];
    const depot = DEPOT_BY_ID[line.depotId];
    const dailyUse = (depot.people / 1000) * good.perThousandPerDay;
    const normalStock = dailyUse * depot.cover[line.goodId];
    const safePct = Math.min(100, (good.safeDays / depot.cover[line.goodId]) * 100);
    const affected = affectedKeys.has(lineKey(line.goodId, line.depotId));

    const base = {
      goodId: line.goodId,
      depotId: line.depotId,
      normalStock,
      dailyUse,
      safePct: round1(safePct),
      baseline: { sourceId: line.sourceId, km: Math.round(line.km) },
    };

    if (!affected) {
      return {
        ...base,
        affected: false,
        risk: "Low" as SupplyRisk,
        seriesPct: new Array<number>(HORIZON_HOURS + 1).fill(100),
        hoursToThreshold: null,
        hoursToStockout: null,
        delayHours: 0,
        delayedShipments: 0,
        chosen: null,
        options: [],
      };
    }

    const alts = alternativesFor(closedIds, line, affectedKeys);
    const options = [alts.reroute, alts.transfer].filter((o): o is SupplyOption => o !== null);
    let chosen: SupplyOption | null = null;
    for (const o of options) {
      if (chosen === null || o.leadHours < chosen.leadHours) chosen = o;
    }

    const normalHours = line.km / SPEED_KMH;
    const hourlyUse = dailyUse / 24;
    const seriesPct: number[] = [100];
    let stock = normalStock;
    for (let h = 0; h < HORIZON_HOURS; h += 1) {
      let factor = 0;
      if (chosen && h >= chosen.leadHours) factor = chosen.cap;
      if (h >= closureHours + normalHours) factor = stock < normalStock ? CATCHUP : 1;
      stock = Math.min(normalStock, Math.max(0, stock + hourlyUse * (factor - 1)));
      seriesPct.push(round1((stock / normalStock) * 100));
    }

    const thresholdIdx = seriesPct.findIndex((p) => p < base.safePct);
    const stockoutIdx = seriesPct.findIndex((p) => p <= 0.05);
    const hoursToThreshold = thresholdIdx >= 0 ? thresholdIdx : null;
    const hoursToStockout = stockoutIdx >= 0 ? stockoutIdx : null;

    const delayHours = chosen
      ? DISPATCH_HOURS + Math.max(0, (chosen.km - line.km) / SPEED_KMH)
      : closureHours;
    const delayedShipments = Math.max(
      1,
      Math.round((good.shipmentsPerDay * Math.min(closureHours, 72)) / 24)
    );

    return {
      ...base,
      affected: true,
      risk: riskFor(hoursToThreshold, hoursToStockout),
      seriesPct,
      hoursToThreshold,
      hoursToStockout,
      delayHours: round1(delayHours),
      delayedShipments,
      chosen,
      options,
    };
  });

  const byGood = {} as Record<GoodId, GoodSummary>;
  for (const id of GOOD_IDS) {
    let risk: SupplyRisk = "Low";
    let affectedDepots = 0;
    let belowSafeSoon = 0;
    let stockouts = 0;
    let people = 0;
    let earliest: { depotId: string; hours: number } | null = null;
    for (const item of items) {
      if (item.goodId !== id || !item.affected) continue;
      affectedDepots += 1;
      risk = worst(risk, item.risk);
      if (item.hoursToThreshold !== null && item.hoursToThreshold <= 72) {
        belowSafeSoon += 1;
        people += DEPOT_BY_ID[item.depotId].people;
      }
      if (item.hoursToStockout !== null && item.hoursToStockout <= 72) stockouts += 1;
      if (item.hoursToThreshold !== null && (earliest === null || item.hoursToThreshold < earliest.hours)) {
        earliest = { depotId: item.depotId, hours: item.hoursToThreshold };
      }
    }
    byGood[id] = { goodId: id, risk, affectedDepots, belowSafeSoon, stockouts, people, earliest };
  }

  const affectedItems = items.filter((i) => i.affected);
  const affectedDepotIds = Array.from(new Set(affectedItems.map((i) => i.depotId)));
  const delayedShipments = affectedItems.reduce((sum, i) => sum + i.delayedShipments, 0);
  const delaySum = affectedItems.reduce((sum, i) => sum + i.delayedShipments * i.delayHours, 0);
  let overallRisk: SupplyRisk = "Low";
  for (const id of GOOD_IDS) overallRisk = worst(overallRisk, byGood[id].risk);

  return {
    edgeId,
    closureHours,
    items,
    byGood,
    overallRisk,
    affectedDepotIds,
    people: affectedDepotIds.reduce((sum, id) => sum + DEPOT_BY_ID[id].people, 0),
    delayedShipments,
    avgDelayHours: delayedShipments > 0 ? Math.round(delaySum / delayedShipments) : 0,
  };
}
