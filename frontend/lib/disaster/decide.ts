import { hubById } from "../data";
import { fmt, plural } from "../format";
import { EDGE_BY_ID, FACILITY_BY_ID, pathBetween } from "../isolation/network";
import { DEPENDENTS, VILLAGE_BY_ID, populationOf } from "../isolation/villages";
import { DEPOT_BY_ID } from "../supply/depots";
import { GOOD_BY_ID, type GoodId } from "../supply/goods";
import { LINES_BY_EDGE } from "../supply/model";
import type { Decision, Scenario, StepResult } from "./types";

const PRIORITY_RANK = { Immediate: 0, "Within 12 hours": 1, "Within 24 hours": 2 };
const GOOD_PRIORITY: GoodId[] = ["medicine", "fuel", "lpg", "food", "relief"];

function hubName(id: string): string {
  return hubById[id]?.name ?? id;
}

function topVillages(step: StepResult, predicate: (id: string) => boolean) {
  return Object.keys(step.villages)
    .filter(predicate)
    .map((id) => VILLAGE_BY_ID[id])
    .sort((a, b) => b.population - a.population);
}

// Action recommendations for one point in the replay.
export function decisionsFor(scenario: Scenario, stepIndex: number): Decision[] {
  const s = scenario.steps[stepIndex];
  const last = scenario.steps[scenario.steps.length - 1];
  const type = scenario.config.type;
  const out: Decision[] = [];

  const hasImpact =
    s.counts.affected > 0 || s.blockedEdgeIds.length > 0 || s.degradedEdgeIds.length > 0 || s.counts.exposed > 0;
  if (!hasImpact) {
    return [
      {
        priority: "Within 24 hours",
        title: "No transport impact yet",
        detail: "The hazard zone has not reached any modelled road or village. Keep monitoring and check again at the next step.",
      },
    ];
  }

  if (s.counts.exposed > 0 && scenario.config.severity >= 2 && type !== "bridge" && type !== "blockage") {
    const exposed = topVillages(s, (id) => s.villages[id].exposed);
    out.push({
      priority: "Immediate",
      title: "Move people out of the hazard zone",
      detail: `${s.counts.exposed} ${plural(s.counts.exposed, "village", "villages")} with ${fmt(s.population.exposed)} people lie inside the hazard zone. Start with ${exposed[0].name}. Direct people to higher ground or the nearest relief camp.`,
    });
  }

  if (s.counts.isolated > 0) {
    const isolated = topVillages(s, (id) => s.villages[id].state === "isolated");
    out.push({
      priority: "Immediate",
      title: "Reach isolated villages",
      detail: `${s.counts.isolated} ${plural(s.counts.isolated, "village has", "villages have")} no road to a hospital (${fmt(s.population.isolated)} people). Start with ${isolated[0].name} (${fmt(isolated[0].population)} people). Prepare air or foot-carry supplies and a mobile medical unit.`,
    });
  }

  if (s.blockedEdgeIds.length > 0) {
    const ranked = [...s.blockedEdgeIds].sort((a, b) => {
      const score = (id: string) => populationOf(DEPENDENTS[id] ?? []) + (LINES_BY_EDGE[id]?.length ?? 0) * 1000;
      return score(b) - score(a);
    });
    const id = ranked[0];
    const road = s.roads[id];
    out.push({
      priority: "Immediate",
      title: `Send clearance teams to ${EDGE_BY_ID[id].name}`,
      detail: `Blocked between km ${Math.round(road.stretch.startKm)} and km ${Math.round(road.stretch.endKm)}. Reopening it restores routes for ${fmt(populationOf(DEPENDENTS[id] ?? []))} village residents and ${LINES_BY_EDGE[id]?.length ?? 0} supply lines.`,
    });
  } else if (s.degradedEdgeIds.length > 0) {
    out.push({
      priority: "Within 12 hours",
      title: `Restrict heavy vehicles on ${EDGE_BY_ID[s.degradedEdgeIds[0]].name}`,
      detail: "The road is degraded. Give ambulances and essential goods priority and add travel time to schedules.",
    });
  }

  if (s.supply.linesImpacted > 0) {
    const goodId = GOOD_PRIORITY.find((g) => s.supply.byGood[g] > 0);
    if (goodId) {
      const good = GOOD_BY_ID[goodId];
      const depots = s.supply.depotsImpacted
        .map((id) => DEPOT_BY_ID[id])
        .filter((d) => !good.sources.includes(d.id))
        .sort((a, b) => b.people - a.people);
      const depot = depots[0];
      if (depot) {
        const blocked = new Set(s.blockedEdgeIds);
        let best: { km: number; from: string; nodes: string[] } | null = null;
        for (const src of good.sources) {
          const p = pathBetween(src, depot.id, blocked);
          if (p && (best === null || p.km < best.km)) best = { km: Math.round(p.km), from: src, nodes: p.nodeIds };
        }
        if (best === null) {
          out.push({
            priority: "Within 12 hours",
            title: `Plan air supply of ${good.label.toLowerCase()} to ${depot.name}`,
            detail: "No open road reaches this depot. Protect health facilities first.",
          });
        } else if (blocked.size === 0) {
          out.push({
            priority: "Within 12 hours",
            title: `Send ${good.label.toLowerCase()} to ${depot.name} early`,
            detail: "The normal route is slowed. Dispatch now and split loads across vehicles.",
          });
        } else {
          out.push({
            priority: "Within 12 hours",
            title: `Dispatch ${good.label.toLowerCase()} to ${depot.name}`,
            detail: `Send from ${hubName(best.from)} hub via ${best.nodes.map(hubName).join(", ")} (${best.km} km). The normal route is blocked or slowed.`,
          });
        }
      }
    }
  }

  if (s.population.isolated > 0 || s.population.delayed > 0) {
    const worst = s.medical.worstVillageId ? s.villages[s.medical.worstVillageId] : null;
    const facility = worst && worst.facilityId ? FACILITY_BY_ID[worst.facilityId].name : null;
    out.push({
      priority: "Within 12 hours",
      title: "Alert hospitals and position ambulances",
      detail: `${fmt(s.medical.cutOff)} people are cut off and ${fmt(s.medical.delayed)} face longer trips${s.medical.avgExtraKm !== null ? ` (about ${s.medical.avgExtraKm} km more)` : ""}.${facility ? ` Tell ${facility} to expect delayed arrivals.` : ""}`,
    });
  }

  if (stepIndex < scenario.steps.length - 1) {
    if (last.counts.affected > s.counts.affected) {
      out.push({
        priority: "Within 24 hours",
        title: "Plan for the impact to grow",
        detail: `Affected villages rise from ${s.counts.affected} to ${last.counts.affected} and affected people from ${fmt(s.population.affected)} to ${fmt(last.population.affected)} by 48 hours. Pre-stage teams and stock now.`,
      });
    } else {
      out.push({
        priority: "Within 24 hours",
        title: "Impact is expected to hold",
        detail: "The model shows no further growth in affected villages by 48 hours. Keep response teams in place.",
      });
    }
  } else {
    out.push({
      priority: "Within 24 hours",
      title: "Plan a phased reopening",
      detail: "The hazard zone has reached its full extent. Reopen roads in the order that restores the most people, and keep degraded roads limited to essential traffic.",
    });
  }

  return out.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]).slice(0, 6);
}
