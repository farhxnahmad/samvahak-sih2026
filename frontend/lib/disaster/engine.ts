import { hubById } from "../data";
import { fmt, plural } from "../format";
import { haversineKm, pathLengthKm } from "../geo";
import { nearestOnPath, pointAt } from "../isolation/geometry";
import { EDGES, EDGE_BY_ID } from "../isolation/network";
import { nearest, type Option } from "../isolation/routing";
import { isDelayed, medicalRiskOf } from "../isolation/simulate";
import type { Emergency, MedicalRisk, Village, VillageState } from "../isolation/types";
import { BASELINE, VILLAGES, VILLAGE_BY_ID } from "../isolation/villages";
import { DISTRICT_RISKS } from "../risk/engine";
import { CATEGORY, categoryOf, clamp, type RiskCategory } from "../risk/model";
import { GOODS, GOOD_IDS, type GoodId } from "../supply/goods";
import { LINES_BY_EDGE, lineKey } from "../supply/model";
import type { LatLng } from "../types";
import { DEGRADE_MULT, HILLY_STATES, RISK_BOOST, SEVERITY_LABEL, TYPE_INFO, radiusAt } from "./meta";
import { treesWeighted } from "./routing";
import {
  STEPS,
  type DisasterAlert,
  type DisasterType,
  type DisasterVillage,
  type DistrictScore,
  type RoadState,
  type Scenario,
  type ScenarioConfig,
  type Severity,
  type Step,
  type StepResult,
} from "./types";

const MEDICAL_ORDER: MedicalRisk[] = ["Low", "Moderate", "High", "Critical"];
const CATEGORY_RANK: Record<RiskCategory, number> = { low: 0, moderate: 1, high: 2, critical: 3 };

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

interface EdgeHit {
  distKm: number;
  fraction: number;
  ratio: number;
  hilly: boolean;
}

function edgeHits(epicentre: LatLng): Record<string, EdgeHit> {
  const hits: Record<string, EdgeHit> = {};
  for (const edge of EDGES) {
    const hit = nearestOnPath(epicentre, edge.path);
    hits[edge.id] = {
      distKm: hit.distKm,
      fraction: hit.fraction,
      ratio: edge.lengthKm / (pathLengthKm(edge.path) || 1),
      hilly: HILLY_STATES.has(hubById[edge.from].state) || HILLY_STATES.has(hubById[edge.to].state),
    };
  }
  return hits;
}

// Which roads are blocked or degraded at a given hazard radius.
function roadStatesAt(
  hits: Record<string, EdgeHit>,
  type: DisasterType,
  radiusKm: number
): Record<string, RoadState> {
  const out: Record<string, RoadState> = {};
  for (const edge of EDGES) {
    const hit = hits[edge.id];
    let blockShare = TYPE_INFO[type].blockShare;
    if (type === "flood" && hit.hilly) blockShare = 0;
    if (type === "rainfall" && !hit.hilly) blockShare = 0;

    const stretchAt = (rKm: number): { startKm: number; endKm: number } | null => {
      if (rKm <= 0 || hit.distKm > rKm) return null;
      const half = Math.max(0.75, Math.sqrt(rKm * rKm - hit.distKm * hit.distKm) * hit.ratio);
      const center = hit.fraction * edge.lengthKm;
      return { startKm: Math.max(0, center - half), endKm: Math.min(edge.lengthKm, center + half) };
    };

    const blocked = stretchAt(radiusKm * blockShare);
    if (blocked) {
      out[edge.id] = { edgeId: edge.id, condition: "blocked", stretch: blocked };
      continue;
    }
    const degraded = stretchAt(radiusKm);
    if (degraded) out[edge.id] = { edgeId: edge.id, condition: "degraded", stretch: degraded };
  }
  return out;
}

function optionsUnder(v: Village, roads: Record<string, RoadState>, mult: number): Option[] {
  const edge = EDGE_BY_ID[v.roadId];
  const state = roads[v.roadId];
  const posKm = v.at * edge.lengthKm;
  const options: Option[] = [];

  if (state && state.condition === "blocked") {
    if (posKm <= state.stretch.startKm) {
      options.push({ nodeId: edge.from, km: v.spurKm + posKm, viaEdge: edge.id });
    } else if (posKm >= state.stretch.endKm) {
      options.push({ nodeId: edge.to, km: v.spurKm + (edge.lengthKm - posKm), viaEdge: edge.id });
    }
  } else {
    const m = state && state.condition === "degraded" ? mult : 1;
    options.push({ nodeId: edge.from, km: v.spurKm + posKm * m, viaEdge: edge.id });
    options.push({ nodeId: edge.to, km: v.spurKm + (edge.lengthKm - posKm) * m, viaEdge: edge.id });
  }
  if (v.alt) options.push({ nodeId: v.alt.nodeId, km: v.alt.km, viaEdge: null });
  return options;
}

interface Context {
  config: ScenarioConfig;
  districtName: string;
  epicentre: LatLng;
  hits: Record<string, EdgeHit>;
}

function computeStep(ctx: Context, hour: Step): StepResult {
  const { config, epicentre, hits } = ctx;
  const radiusKm = radiusAt(config.type, config.severity, hour);
  const roads = roadStatesAt(hits, config.type, radiusKm);

  const blockedEdgeIds = Object.values(roads).filter((r) => r.condition === "blocked").map((r) => r.edgeId);
  const degradedEdgeIds = Object.values(roads).filter((r) => r.condition === "degraded").map((r) => r.edgeId);
  const mult = DEGRADE_MULT[config.severity];
  const multiplier: Record<string, number> = {};
  degradedEdgeIds.forEach((id) => {
    multiplier[id] = mult;
  });
  const trees = treesWeighted(new Set(blockedEdgeIds), multiplier);

  const villages: Record<string, DisasterVillage> = {};
  const counts = { isolated: 0, atRisk: 0, exposed: 0, affected: 0 };
  const population = { isolated: 0, atRisk: 0, exposed: 0, affected: 0, delayed: 0 };
  let extraSum = 0;
  let extraCount = 0;
  let worstVillageId: string | null = null;
  let worstPop = -1;

  for (const v of VILLAGES) {
    const options = optionsUnder(v, roads, mult);
    const health = nearest("healthcare", options, trees);
    const supply = nearest("supply", options, trees);
    const base = BASELINE[v.id];
    const exposed = haversineKm(v.pos, epicentre) <= radiusKm;

    let emergency: Emergency = "accessible";
    if (health === null) emergency = "cut-off";
    else if (isDelayed(base.health.km, health.km)) emergency = "delayed";
    const supplyLost = supply === null;
    const supplyDelayed = supply !== null && isDelayed(base.supply.km, supply.km);

    let state: VillageState = "other";
    if (emergency === "cut-off") state = "isolated";
    else if (emergency === "delayed" || supplyLost || supplyDelayed || exposed) state = "at-risk";

    let reason = "Access is unchanged.";
    if (state === "isolated") reason = "No usable road to any hospital.";
    else if (emergency === "delayed" && health) {
      reason = `Hospital trip grows from ${round1(base.health.km)} km to ${round1(health.km)} km.`;
    } else if (supplyLost) reason = "Supply depots cannot be reached.";
    else if (supplyDelayed) reason = "Supply trips are much longer.";
    else if (exposed) reason = "Inside the hazard zone.";

    villages[v.id] = {
      state,
      emergency,
      exposed,
      healthBaseKm: round1(base.health.km),
      healthAfterKm: health ? round1(health.km) : null,
      facilityId: health ? health.facilityId : null,
      reason,
    };

    if (exposed) {
      counts.exposed += 1;
      population.exposed += v.population;
    }
    if (state === "isolated") {
      counts.isolated += 1;
      population.isolated += v.population;
    } else if (state === "at-risk") {
      counts.atRisk += 1;
      population.atRisk += v.population;
    }
    if (emergency === "delayed") {
      population.delayed += v.population;
      if (health) {
        extraSum += health.km - base.health.km;
        extraCount += 1;
      }
    }
    if ((state === "isolated" || state === "at-risk") && v.population > worstPop) {
      worstPop = v.population;
      worstVillageId = v.id;
    }
  }
  counts.affected = counts.isolated + counts.atRisk;
  population.affected = population.isolated + population.atRisk;

  // Supply routes that use a blocked or degraded road.
  const lineKeys = new Set<string>();
  const depotsImpacted = new Set<string>();
  const byGoodDepots: Record<GoodId, Set<string>> = {
    medicine: new Set(), food: new Set(), lpg: new Set(), fuel: new Set(), relief: new Set(),
  };
  let roadsImpacted = 0;
  for (const id of [...blockedEdgeIds, ...degradedEdgeIds]) {
    const lines = LINES_BY_EDGE[id] ?? [];
    if (lines.length > 0) roadsImpacted += 1;
    for (const l of lines) {
      lineKeys.add(lineKey(l.goodId, l.depotId));
      depotsImpacted.add(l.depotId);
      byGoodDepots[l.goodId].add(l.depotId);
    }
  }
  const byGood = {} as Record<GoodId, number>;
  for (const id of GOOD_IDS) byGood[id] = byGoodDepots[id].size;

  // Accessibility risk scores: raise districts near the hazard zone and near damaged roads.
  const boost = RISK_BOOST[config.severity];
  const districts: Record<string, DistrictScore> = {};
  for (const d of DISTRICT_RISKS) {
    const dist = haversineKm(d.pos, epicentre);
    const reach = radiusKm * 1.3;
    let add = dist < reach ? boost * (1 - dist / reach) : 0;
    for (const id of blockedEdgeIds) {
      if (nearestOnPath(d.pos, EDGE_BY_ID[id].path).distKm <= 40) add += 8;
    }
    for (const id of degradedEdgeIds) {
      if (nearestOnPath(d.pos, EDGE_BY_ID[id].path).distKm <= 40) add += 4;
    }
    const score = Math.round(clamp(d.score + add));
    districts[d.id] = { base: d.score, score, delta: score - d.score };
  }

  return {
    hour,
    radiusKm,
    roads,
    blockedEdgeIds,
    degradedEdgeIds,
    villages,
    counts,
    population,
    medical: {
      risk: medicalRiskOf(population.isolated, population.delayed),
      cutOff: population.isolated,
      delayed: population.delayed,
      avgExtraKm: extraCount > 0 ? Math.round(extraSum / extraCount) : null,
      worstVillageId,
    },
    supply: {
      roadsImpacted,
      linesImpacted: lineKeys.size,
      byGood,
      depotsImpacted: Array.from(depotsImpacted),
    },
    districts,
    alerts: [],
  };
}

function buildAlerts(ctx: Context, prev: StepResult | null, cur: StepResult): DisasterAlert[] {
  const { config, districtName } = ctx;
  const info = TYPE_INFO[config.type];
  const out: DisasterAlert[] = [];
  const push = (key: string, level: DisasterAlert["level"], title: string, detail: string) => {
    out.push({ id: `${cur.hour}-${key}`, hour: cur.hour, level, title, detail });
  };

  if (prev === null) {
    push(
      "declared",
      config.severity >= 3 ? "critical" : "warning",
      `${info.label} declared`,
      `${SEVERITY_LABEL[config.severity]} ${info.label.toLowerCase()} at ${districtName}, ${ctx.config.state}.`
    );
  }

  const prevBlocked = new Set(prev ? prev.blockedEdgeIds : []);
  for (const id of cur.blockedEdgeIds) {
    if (prevBlocked.has(id)) continue;
    const road = cur.roads[id];
    push(`blocked-${id}`, "critical", `Road blocked: ${EDGE_BY_ID[id].name}`,
      `Blocked between km ${Math.round(road.stretch.startKm)} and km ${Math.round(road.stretch.endKm)}.`);
  }
  const prevRoads = prev ? prev.roads : {};
  for (const id of cur.degradedEdgeIds) {
    if (prevRoads[id]) continue;
    push(`degraded-${id}`, "warning", `Road degraded: ${EDGE_BY_ID[id].name}`,
      "Expect slow traffic. Heavy vehicles are at risk.");
  }

  const newlyIsolated = Object.keys(cur.villages).filter(
    (id) => cur.villages[id].state === "isolated" && !(prev && prev.villages[id].state === "isolated")
  );
  if (newlyIsolated.length > 0) {
    const sorted = newlyIsolated.map((id) => VILLAGE_BY_ID[id]).sort((a, b) => b.population - a.population);
    const people = sorted.reduce((sum, v) => sum + v.population, 0);
    push("isolated", "critical",
      `${newlyIsolated.length} ${plural(newlyIsolated.length, "village", "villages")} isolated`,
      `${sorted.slice(0, 3).map((v) => v.name).join(", ")}${sorted.length > 3 ? " and others" : ""}. ${fmt(people)} people have no road to a hospital.`);
  }

  const prevMedical = prev ? MEDICAL_ORDER.indexOf(prev.medical.risk) : 0;
  const curMedical = MEDICAL_ORDER.indexOf(cur.medical.risk);
  if (curMedical > prevMedical && curMedical >= 1) {
    push("medical", curMedical >= 2 ? "critical" : "warning",
      `Medical access risk ${cur.medical.risk}`,
      `${fmt(cur.medical.cutOff)} people are cut off and ${fmt(cur.medical.delayed)} face longer hospital trips.`);
  }

  const prevLines = prev ? prev.supply.linesImpacted : 0;
  if (cur.supply.linesImpacted > prevLines) {
    const goods = GOODS.filter((g) => cur.supply.byGood[g.id] > 0)
      .map((g) => `${g.label.toLowerCase()} (${cur.supply.byGood[g.id]})`)
      .join(", ");
    push("supply", "warning", "Supply routes disrupted", `Depots affected by good: ${goods}.`);
  }

  const rising = DISTRICT_RISKS.filter((d) => {
    const now = CATEGORY_RANK[categoryOf(cur.districts[d.id].score)];
    const before = prev ? CATEGORY_RANK[categoryOf(prev.districts[d.id].score)] : CATEGORY_RANK[categoryOf(d.score)];
    return now >= 2 && now > before;
  })
    .sort((a, b) => cur.districts[b.id].score - cur.districts[a.id].score)
    .slice(0, 3);
  for (const d of rising) {
    const cat = categoryOf(cur.districts[d.id].score);
    push(`district-${d.id}`, cat === "critical" ? "critical" : "warning",
      `${d.name} accessibility risk ${CATEGORY[cat].label}`,
      `Score is now ${cur.districts[d.id].score}, up ${cur.districts[d.id].delta} points.`);
  }

  const rank = { critical: 0, warning: 1, info: 2 };
  return out.sort((a, b) => rank[a.level] - rank[b.level]).slice(0, 7);
}

export function runScenario(config: ScenarioConfig): Scenario {
  const district = DISTRICT_RISKS.find((d) => d.id === config.districtId) ?? DISTRICT_RISKS[0];
  const info = TYPE_INFO[config.type];

  let epicentre: LatLng = district.pos;
  let snapped = false;
  let snapDistanceKm = 0;
  let snappedRoadName: string | null = null;

  if (info.snapsToRoad) {
    let bestDist = Infinity;
    for (const edge of EDGES) {
      const hit = nearestOnPath(district.pos, edge.path);
      if (hit.distKm < bestDist) {
        bestDist = hit.distKm;
        const f = Math.min(0.9, Math.max(0.1, hit.fraction));
        epicentre = f === hit.fraction ? hit.pos : pointAt(edge.path, f).pos;
        snappedRoadName = edge.name;
      }
    }
    snapped = true;
    snapDistanceKm = Math.round(bestDist);
  }

  const ctx: Context = {
    config,
    districtName: district.name,
    epicentre,
    hits: edgeHits(epicentre),
  };

  const steps: StepResult[] = [];
  for (const hour of STEPS) {
    const step = computeStep(ctx, hour);
    step.alerts = buildAlerts(ctx, steps.length > 0 ? steps[steps.length - 1] : null, step);
    steps.push(step);
  }

  return {
    config,
    districtName: district.name,
    epicentre,
    snapped,
    snapDistanceKm,
    snappedRoadName,
    finalRadiusKm: info.radiusKm[config.severity - 1],
    steps,
  };
}

export const SEVERITIES: Severity[] = [1, 2, 3, 4];
