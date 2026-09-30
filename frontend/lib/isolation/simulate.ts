import { hubById } from "../data";
import type { LatLng } from "../types";
import { distanceToPathKm, slicePath } from "./geometry";
import { EDGES, EDGE_BY_ID, FACILITY_BY_ID, pathBetween, treesFor } from "./network";
import { nearest, optionsFor } from "./routing";
import { BASELINE, DEPENDENTS, VILLAGES } from "./villages";
import type {
  Blockage,
  Detour,
  Emergency,
  MedicalRisk,
  SimulationResult,
  VillageImpact,
  VillageState,
} from "./types";

// A trip counts as delayed when it grows by 20 km or more, or by 40% and at least 5 km.
export function isDelayed(baseKm: number, afterKm: number): boolean {
  const extra = afterKm - baseKm;
  return extra >= 20 || (extra >= 5 && extra >= baseKm * 0.4);
}

export function medicalRiskOf(isolatedPop: number, delayedPop: number): MedicalRisk {
  if (isolatedPop >= 8000) return "Critical";
  if (isolatedPop >= 2000 || isolatedPop + delayedPop >= 10000) return "High";
  if (isolatedPop > 0 || delayedPop >= 1500) return "Moderate";
  return "Low";
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// Road stretches that are still usable after the blockage.
function usableRoads(blockage: Blockage): LatLng[][] {
  const edge = EDGE_BY_ID[blockage.edgeId];
  const roads: LatLng[][] = EDGES.filter((e) => e.id !== edge.id).map((e) => e.path);
  const f0 = blockage.startKm / edge.lengthKm;
  const f1 = blockage.endKm / edge.lengthKm;
  if (f0 > 0) roads.push(slicePath(edge.path, 0, f0));
  if (f1 < 1) roads.push(slicePath(edge.path, f1, 1));
  return roads;
}

export function simulate(blockage: Blockage): SimulationResult {
  const edge = EDGE_BY_ID[blockage.edgeId];
  const blocked = new Set<string>([edge.id]);
  const trees = treesFor(blocked);
  const roads = usableRoads(blockage);
  const dependents = DEPENDENTS[edge.id] ?? new Set<string>();

  const impacts: VillageImpact[] = VILLAGES.map((v) => {
    const options = optionsFor(v, blockage);
    const health = nearest("healthcare", options, trees);
    const supply = nearest("supply", options, trees);
    const base = BASELINE[v.id];

    let alternativeKm = Infinity;
    for (const road of roads) {
      alternativeKm = Math.min(alternativeKm, distanceToPathKm(v.pos, road));
    }
    if (v.alt) alternativeKm = Math.min(alternativeKm, v.alt.km);

    let emergency: Emergency = "accessible";
    if (health === null) emergency = "cut-off";
    else if (isDelayed(base.health.km, health.km)) emergency = "delayed";

    const supplyLost = supply === null;
    const supplyDelayed = supply !== null && isDelayed(base.supply.km, supply.km);

    let state: VillageState = "other";
    if (emergency === "cut-off") state = "isolated";
    else if (emergency === "delayed" || supplyLost || supplyDelayed) state = "at-risk";
    else if (dependents.has(v.id)) state = "connected";

    let reason = "Route to care and supplies is unchanged.";
    if (state === "isolated") {
      reason = `No usable road to any hospital. The nearest working road is ${round1(alternativeKm)} km away.`;
    } else if (emergency === "delayed" && health) {
      reason = `Trip to a hospital grows from ${round1(base.health.km)} km to ${round1(health.km)} km.`;
    } else if (supplyLost) {
      reason = "Supply depots can no longer be reached.";
    } else if (supplyDelayed && supply) {
      reason = `Trip to a supply depot grows from ${round1(base.supply.km)} km to ${round1(supply.km)} km.`;
    } else if (state === "connected") {
      reason = "Still connected by another route with a small detour.";
    }

    return {
      villageId: v.id,
      state,
      emergency,
      healthBaseKm: round1(base.health.km),
      healthAfterKm: health ? round1(health.km) : null,
      healthFacilityId: health ? health.facilityId : null,
      supplyBaseKm: round1(base.supply.km),
      supplyAfterKm: supply ? round1(supply.km) : null,
      nearestAlternativeKm: round1(alternativeKm),
      reason,
    };
  });

  const byId: Record<string, VillageImpact> = {};
  let populationIsolated = 0;
  let populationAtRisk = 0;
  let populationDelayed = 0;
  let isolatedCount = 0;
  let atRiskCount = 0;
  let reroutedCount = 0;
  let nearestAlternativeKm: number | null = null;

  impacts.forEach((impact, i) => {
    byId[impact.villageId] = impact;
    const pop = VILLAGES[i].population;
    if (impact.state === "isolated") {
      isolatedCount += 1;
      populationIsolated += pop;
      nearestAlternativeKm =
        nearestAlternativeKm === null
          ? impact.nearestAlternativeKm
          : Math.min(nearestAlternativeKm, impact.nearestAlternativeKm);
    } else if (impact.state === "at-risk") {
      atRiskCount += 1;
      populationAtRisk += pop;
    } else if (impact.state === "connected") {
      reroutedCount += 1;
    }
    if (impact.emergency === "delayed") populationDelayed += pop;
  });

  const route = pathBetween(edge.from, edge.to, blocked);
  const detour: Detour | null = route
    ? {
        nodeIds: route.nodeIds,
        edgeIds: route.edgeIds,
        km: Math.round(route.km),
        extraKm: Math.round(route.km - edge.lengthKm),
      }
    : null;

  return {
    blockage,
    edge,
    impacts,
    byId,
    isolatedCount,
    atRiskCount,
    reroutedCount,
    affectedCount: isolatedCount + atRiskCount,
    populationIsolated,
    populationAtRisk,
    populationImpacted: populationIsolated + populationAtRisk,
    populationDelayed,
    medicalRisk: medicalRiskOf(populationIsolated, populationDelayed),
    detour,
    nearestAlternativeKm,
  };
}

export function facilityName(id: string | null): string {
  if (!id) return "no reachable hospital";
  return FACILITY_BY_ID[id]?.name ?? id;
}

export function hubName(id: string): string {
  return hubById[id]?.name ?? id;
}
