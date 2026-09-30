import { fmt, plural } from "../format";
import { facilityName, hubName } from "./simulate";
import { VILLAGE_BY_ID } from "./villages";
import type { SimulationResult } from "./types";

// Plain-language recommendations built from the simulation numbers.
export function recommendations(result: SimulationResult): string[] {
  const out: string[] = [];
  const edge = result.edge;

  const isolated = result.impacts
    .filter((i) => i.state === "isolated")
    .map((i) => ({ impact: i, village: VILLAGE_BY_ID[i.villageId] }))
    .sort((a, b) => b.village.population - a.village.population);
  const atRisk = result.impacts
    .filter((i) => i.state === "at-risk")
    .map((i) => ({ impact: i, village: VILLAGE_BY_ID[i.villageId] }))
    .sort((a, b) => b.village.population - a.village.population);

  if (result.affectedCount === 0) {
    out.push("No village loses emergency access from this blockage. Routine monitoring is enough.");
    if (result.reroutedCount > 0) {
      out.push(
        `${result.reroutedCount} ${plural(result.reroutedCount, "village reroutes", "villages reroute")} with only a small detour.`
      );
    }
    return out;
  }

  const routeB = result.detour && result.detour.km <= 350
    ? `Route B (${result.detour.nodeIds.map(hubName).join(" to ")}, ${result.detour.km} km)`
    : null;

  if (atRisk.length > 0) {
    out.push(
      `Deploy emergency supplies to ${atRisk.length} at-risk ${plural(atRisk.length, "village", "villages")} via ${routeB ?? "their remaining link roads"} before complete isolation occurs.`
    );
  }

  if (isolated.length > 0) {
    const top = isolated[0];
    const km = result.nearestAlternativeKm;
    out.push(
      `Plan airlift or foot-carry supplies for ${isolated.length} isolated ${plural(isolated.length, "village", "villages")} (${fmt(result.populationIsolated)} people), starting with ${top.village.name} (${fmt(top.village.population)} people).${km !== null ? ` The nearest working road is ${km.toFixed(1)} km away.` : ""}`
    );
  }

  if (result.medicalRisk === "High" || result.medicalRisk === "Critical") {
    if (isolated.length > 0) {
      out.push(
        `Pre-position a mobile medical unit near ${isolated[0].village.name} and agree an evacuation point at the nearest working road.`
      );
    }
  } else if (atRisk.length > 0) {
    const worst = atRisk.find((a) => a.impact.emergency === "delayed");
    if (worst) {
      out.push(
        `Alert ${facilityName(worst.impact.healthFacilityId)}: ${worst.village.name} now needs ${worst.impact.healthAfterKm} km to reach care, up from ${worst.impact.healthBaseKm} km.`
      );
    }
  }

  out.push(
    `Prioritise clearing the ${edge.name} road between km ${Math.round(result.blockage.startKm)} and km ${Math.round(result.blockage.endKm)}. It restores access for ${fmt(result.populationImpacted)} people.`
  );
  return out;
}
