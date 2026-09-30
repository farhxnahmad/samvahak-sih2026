import { corridors, hubById, incidents } from "../data";
import { fmt, plural } from "../format";
import { EDGE_BY_ID, EDGES } from "../isolation/network";
import { recommendations as isolationAdvice } from "../isolation/recommend";
import { simulate } from "../isolation/simulate";
import { DEPENDENTS, VILLAGE_BY_ID, populationOf } from "../isolation/villages";
import { DISTRICT_RISKS, scoreAt } from "../risk/engine";
import { CATEGORY, FACTOR_LABEL, categoryOf, scoreColor, type FactorKey } from "../risk/model";
import { DEPOTS, DEPOT_BY_ID } from "../supply/depots";
import { GOODS, GOOD_BY_ID, GOOD_IDS } from "../supply/goods";
import { LINES, LINES_BY_EDGE, RISK_ORDER, analyse, type LineImpact, type SupplyRisk } from "../supply/model";
import { SUPPLY_RISK_STYLE } from "../supply/style";
import type { LatLng } from "../types";
import { confidence } from "./confidence";
import {
  CAUTION_EDGE_IDS,
  DISRUPTED_EDGE_IDS,
  EDGE_CONTEXT,
  hoursLabel,
  nearbyIncident,
  nearestEdgeContext,
  weatherLabel,
  weatherPeak,
} from "./context";
import type { ParsedQuery } from "./parse";
import { planRoute, routePath } from "./planner";
import type { MapPoint, MapRoute, RecommendationCard, TransportOption } from "./types";
import { boundsOfPoints, buildContext, levelFromCategory, plainList } from "./utils";
import { needMore, type Draft } from "./answerRoute";

const STATUS_COLOR = { clear: "#2f7d52", caution: "#c98a1b", disrupted: "#b0432f" } as const;

// ---------------------------------------------------------------- district vulnerability

const FACTOR_ACTION: Record<FactorKey, (name: string) => string> = {
  weather: (n) => `Pre-position response teams and confirm road status in ${n} before the rain peaks.`,
  incidents: (n) => `Clear the road incident reports in ${n} and hold non-essential freight.`,
  congestion: (n) => `Stagger freight movements around ${n} to ease congestion.`,
  history: (n) => `Inspect the known slide and flood-prone stretches near ${n} before the next dispatch.`,
};

export function answerDistrict(q: ParsedQuery): Draft {
  const state = q.stateMatch ? q.stateMatch.place.state : null;
  const scope = state ? DISTRICT_RISKS.filter((d) => d.state === state) : DISTRICT_RISKS;
  if (scope.length === 0) return needMore("district", "District vulnerability", "I have no district scores for that region.");
  const h = q.horizon;
  const n = q.count ?? 3;
  const ranked = [...scope].sort((a, b) => scoreAt(b, h) - scoreAt(a, h)).slice(0, n);
  const top = ranked[0];
  const topScore = scoreAt(top, h);
  const level = levelFromCategory(categoryOf(topScore));
  const when = h === 0 ? "today" : `in ${h} hours`;
  const nearRoad = nearestEdgeContext(top.pos);
  const nearInc = nearbyIncident(top.pos, 60);
  const peakWeather = weatherPeak(top.state);

  const adjustments = [];
  if (h > 0) adjustments.push({ label: `forecast ${h} hours ahead`, delta: -6 * (h / 24) });
  adjustments.push({ label: "district factors are sample data", delta: -4 });
  const basis = ["Score combines weather, incidents, congestion and history."];

  const cards: RecommendationCard[] = [];
  const futurePeak = top.forecast.filter((p) => p.horizon > 0).reduce((b, p) => (p.score > b.score ? p : b), top.forecast[1]);
  cards.push({
    id: "district-top",
    category: "Risk",
    priority: "Now",
    action: FACTOR_ACTION[top.mainFactor](top.name),
    outcome: `Keeps response time short while the score is ${topScore}${top.trend === "up" ? ` and rising (${top.changePct}% in 24 hours)` : ""}.${futurePeak.score > topScore + 3 ? ` The forecast reaches ${futurePeak.score} (${CATEGORY[futurePeak.category].label}) within ${futurePeak.horizon} hours.` : ""}`,
    confidence: confidence(80, adjustments, basis),
  });
  if (ranked[1]) {
    const d = ranked[1];
    cards.push({
      id: "district-second",
      category: "Risk",
      priority: "Today",
      action: FACTOR_ACTION[d.mainFactor](d.name),
      outcome: `Reduces exposure in the second most vulnerable district, score ${scoreAt(d, h)}.`,
      confidence: confidence(76, adjustments, basis),
    });
  }
  if (nearInc) {
    cards.push({
      id: "district-incident",
      category: "Incident",
      priority: "Now",
      action: `Check the ${nearInc.type.toLowerCase()} report near ${top.name}: ${nearInc.title.toLowerCase()}.`,
      outcome: "Confirms whether the road into the district is usable before dispatch.",
      confidence: confidence(70, [], ["Incident report within 60 km."]),
    });
  }
  const riser = [...scope].filter((d) => !ranked.includes(d)).sort((a, b) => b.changePct - a.changePct)[0];
  if (riser && riser.changePct >= 10) {
    cards.push({
      id: "district-riser",
      category: "Watch",
      priority: "Watch",
      action: `Watch ${riser.name}. Its risk is up ${riser.changePct}% in 24 hours.`,
      outcome: "Catches a district that is climbing the list before it becomes critical.",
      confidence: confidence(70, adjustments, basis),
    });
  }

  const points: MapPoint[] = ranked.map((d) => ({
    pos: d.pos,
    label: `${d.name}: ${scoreAt(d, h)}`,
    kind: "district",
    color: scoreColor(scoreAt(d, h)),
    permanent: true,
  }));

  return {
    intent: "district",
    intentLabel: "District vulnerability",
    title: state ? `Most vulnerable districts, ${state}` : "Most vulnerable districts",
    assessment: {
      level,
      score: topScore,
      headline: `${top.name} (${top.state}) is the most vulnerable district ${when}, with a score of ${topScore} (${CATEGORY[categoryOf(topScore)].label}).`,
      points: [
        ...ranked.map((d, i) => `${i + 1}. ${d.name}, ${d.state}: ${scoreAt(d, h)} (${CATEGORY[categoryOf(scoreAt(d, h))].label}). Main factor: ${FACTOR_LABEL[d.mainFactor].toLowerCase()}.`),
        `${top.name}: weather severity ${top.factors.weather} (${weatherLabel(top.factors.weather)}), risk ${top.trend === "up" ? "rising" : top.trend === "down" ? "falling" : "steady"} against 24 hours ago.`,
      ],
    },
    cards,
    alternatives: [],
    context: buildContext({
      weather: `${top.name} weather severity ${top.factors.weather} (${weatherLabel(top.factors.weather)}). Largest expected rise in ${top.state}: +${peakWeather.delta} within ${peakWeather.hours} hours.`,
      routes: `Nearest modelled road to ${top.name} is ${nearRoad.ctx.edge.name}, ${Math.round(nearRoad.km)} km away, status ${nearRoad.ctx.status}.`,
      incidents: nearInc ? `Open report near ${top.name}: ${nearInc.title.toLowerCase()}.` : `No open incident report within 60 km of ${top.name}.`,
      risk: `Scores use weather 35%, incidents 25%, congestion 20% and history 20%. ${scope.length} districts ranked.`,
    }),
    trace: [
      `Scored ${scope.length} districts${state ? ` in ${state}` : ""} ${when}.`,
      "Ranked by score and read the main factor, trend and forecast for each.",
      "Checked the nearest road status and open incident reports.",
    ],
    notes: [],
    map: { key: `district-${state ?? "all"}-${h}-${n}`, routes: [], points, bounds: boundsOfPoints(ranked.map((d) => d.pos), 0.6) },
  };
}

// ---------------------------------------------------------------- supply risk

function worstOf(risks: SupplyRisk[]): SupplyRisk {
  return risks.reduce<SupplyRisk>((w, r) => (RISK_ORDER.indexOf(r) > RISK_ORDER.indexOf(w) ? r : w), "Low");
}

const RISK_TO_LEVEL: Record<SupplyRisk, "Low" | "Moderate" | "High" | "Critical"> = {
  Low: "Low", Medium: "Moderate", High: "High", Critical: "Critical",
};

export function answerSupply(q: ParsedQuery): Draft {
  const goods = q.goods.length > 0 ? q.goods : GOOD_IDS;
  const state = q.stateMatch ? q.stateMatch.place.state : null;
  const depots = DEPOTS.filter((d) => !state || hubById[d.id].state === state);
  if (depots.length === 0) return needMore("supply", "Supply risk", `I have no depots in ${state}.`);
  const depotIds = new Set(depots.map((d) => d.id));

  const current = analyse(DISRUPTED_EDGE_IDS, 72);
  const items = current.items.filter((i) => goods.includes(i.goodId) && depotIds.has(i.depotId));
  const affectedNow = items.filter((i) => i.affected);

  // Stress test: close each road that feeds these depots, one at a time, for 72 hours.
  const usedEdges = new Set<string>();
  LINES.forEach((l) => {
    if (goods.includes(l.goodId) && depotIds.has(l.depotId)) l.edgeIds.forEach((id) => usedEdges.add(id));
  });
  const stress: Record<string, { edgeId: string; item: LineImpact } | undefined> = {};
  usedEdges.forEach((edgeId) => {
    const a = analyse([edgeId], 72);
    for (const item of a.items) {
      if (!item.affected || !goods.includes(item.goodId) || !depotIds.has(item.depotId)) continue;
      const best = stress[item.goodId];
      if (!best || (item.hoursToThreshold ?? 999) < (best.item.hoursToThreshold ?? 999)) {
        stress[item.goodId] = { edgeId, item };
      }
    }
  });

  const currentRisk = worstOf(affectedNow.map((i) => i.risk));
  const stressRisk = worstOf(goods.map((g) => stress[g]?.item.risk ?? "Low"));
  let level = RISK_TO_LEVEL[currentRisk];
  if (currentRisk === "Low" && (stressRisk === "High" || stressRisk === "Critical")) level = "Moderate";

  const adjustments = [{ label: "stock levels and consumption are sample data", delta: -8 }];
  const cards: RecommendationCard[] = [];
  const alternatives: TransportOption[] = [];

  const urgent = affectedNow
    .filter((i) => RISK_ORDER.indexOf(i.risk) >= RISK_ORDER.indexOf("High"))
    .sort((a, b) => (a.hoursToThreshold ?? 999) - (b.hoursToThreshold ?? 999));
  const seen = new Set<string>();
  for (const item of urgent) {
    if (seen.has(item.goodId) || cards.length >= 2) continue;
    seen.add(item.goodId);
    const good = GOOD_BY_ID[item.goodId];
    const depot = DEPOT_BY_ID[item.depotId];
    const c = item.chosen;
    const how = c === null
      ? "No road route is open, so plan an air dispatch."
      : c.kind === "reroute"
        ? `Dispatch from ${hubById[c.fromId].name} hub via ${c.nodeIds.map((id) => hubById[id].name).join(", ")}.`
        : `Transfer from ${DEPOT_BY_ID[c.fromId].name}, ${c.km} km away.`;
    cards.push({
      id: `supply-now-${item.goodId}`,
      category: "Supply",
      priority: "Now",
      action: `${good.label} at ${depot.name} may fall below the safe threshold in ${item.hoursToThreshold} hours. ${how}`,
      outcome: `Keeps ${depot.name} above the safe level of ${good.safeDays} days of cover.`,
      confidence: confidence(70, adjustments, ["Depot stock, source hubs and current road status."]),
    });
  }

  const stressed = goods
    .map((g) => ({ g, s: stress[g] }))
    .filter((x): x is { g: (typeof goods)[number]; s: { edgeId: string; item: LineImpact } } => x.s !== undefined)
    .sort((a, b) => (a.s.item.hoursToThreshold ?? 999) - (b.s.item.hoursToThreshold ?? 999));
  for (const { g, s } of stressed) {
    if (cards.length >= 4) break;
    const good = GOOD_BY_ID[g];
    const depot = DEPOT_BY_ID[s.item.depotId];
    const target = good.safeDays + 3;
    const cover = depot.cover[g];
    if (cover >= target) continue;
    const units = Math.round((target - cover) * s.item.dailyUse);
    cards.push({
      id: `supply-stress-${g}`,
      category: "Supply",
      priority: cards.length === 0 ? "Today" : "Watch",
      action: `Raise ${good.label.toLowerCase()} stock at ${depot.name} by about ${fmt(units)} ${good.unit}, from ${cover} to ${target} days of cover.`,
      outcome: `Stays above the safe level through a 72-hour closure of any single road, including ${EDGE_BY_ID[s.edgeId].name}.`,
      confidence: confidence(66, adjustments, ["Stress test: each feeding road closed alone for 72 hours."]),
    });
  }
  if (cards.length === 0) {
    cards.push({
      id: "supply-ok",
      category: "Supply",
      priority: "Watch",
      action: "Hold current stock levels. Every depot in scope can ride out a 72-hour closure of any single road.",
      outcome: "No stock action is needed today.",
      confidence: confidence(70, adjustments, ["Stress test of every feeding road."]),
    });
  }

  const focusItem = urgent[0] ?? stressed[0]?.s.item ?? null;
  if (focusItem) {
    focusItem.options.forEach((o) => {
      alternatives.push({
        mode: o.kind === "reroute" ? `Road reroute from ${hubById[o.fromId].name} hub` : `Transfer from ${DEPOT_BY_ID[o.fromId].name}`,
        suitability: focusItem.chosen === o ? "Best" : "Possible",
        time: hoursLabel(o.leadHours),
        note: `${o.km} km, carries about ${Math.round(o.cap * 100)}% of normal volume.`,
      });
    });
    alternatives.push({
      mode: "Air or helicopter dispatch",
      suitability: focusItem.options.length === 0 ? "Best" : "Possible",
      time: "About 6 to 12 h",
      note: "Small loads only. Use for medicines and vaccines first.",
    });
  }

  const points: MapPoint[] = depots.map((d) => {
    const risk = worstOf(items.filter((i) => i.depotId === d.id && i.affected).map((i) => i.risk));
    return { pos: d.pos, label: d.name, kind: "depot", color: SUPPLY_RISK_STYLE[risk].color, permanent: true };
  });
  const routes: MapRoute[] = [];
  const focusEdge = stressed[0]?.s.edgeId;
  if (focusEdge) routes.push({ path: EDGE_BY_ID[focusEdge].path, kind: "highlight", label: `Stress-test road: ${EDGE_BY_ID[focusEdge].name}`, color: "#d1861f" });
  DISRUPTED_EDGE_IDS.forEach((id) => routes.push({ path: EDGE_BY_ID[id].path, kind: "highlight", label: `Disrupted: ${EDGE_BY_ID[id].name}`, color: STATUS_COLOR.disrupted }));

  const goodLabel = goods.length === 1 ? GOOD_BY_ID[goods[0]].label.toLowerCase() : "essential goods";
  const points2 = goods.map((g) => {
    const good = GOOD_BY_ID[g];
    const weakest = [...depots].sort((a, b) => a.cover[g] - good.safeDays - (b.cover[g] - good.safeDays))[0];
    const st = stress[g];
    const now = worstOf(items.filter((i) => i.goodId === g && i.affected).map((i) => i.risk));
    return `${good.label}: ${now} now. Weakest depot ${weakest.name} holds ${weakest.cover[g]} days against a safe level of ${good.safeDays}.${st && st.item.hoursToThreshold !== null ? ` If ${EDGE_BY_ID[st.edgeId].name} closed, ${DEPOT_BY_ID[st.item.depotId].name} would fall below safe in ${st.item.hoursToThreshold} h.` : ""}`;
  });

  const scopeStates = Array.from(new Set(depots.map((d) => hubById[d.id].state)));
  const peak = scopeStates.map((s) => ({ s, ...weatherPeak(s) })).sort((a, b) => b.delta - a.delta)[0];
  const cautionUsed = CAUTION_EDGE_IDS.filter((id) => usedEdges.has(id));

  return {
    intent: "supply",
    intentLabel: "Supply risk",
    title: `${goods.length === 1 ? GOOD_BY_ID[goods[0]].label : "Essential goods"} supply risk${state ? `, ${state}` : ""}`,
    assessment: {
      level,
      score: null,
      headline:
        affectedNow.length === 0
          ? `No ${goodLabel} line${state ? ` in ${state}` : ""} currently uses a disrupted road. ${level === "Moderate" ? "A stress test shows where one road failure would hurt." : "Stock cover holds."}`
          : `${affectedNow.length} ${plural(affectedNow.length, "supply line", "supply lines")} for ${goodLabel}${state ? ` in ${state}` : ""} use a disrupted road. Worst risk: ${currentRisk}.`,
      points: points2,
    },
    cards,
    alternatives,
    context: buildContext({
      weather: `Largest expected weather rise in ${peak?.s ?? "the region"}: +${peak?.delta ?? 0} within ${peak?.hours ?? 24} hours.`,
      routes: DISRUPTED_EDGE_IDS.length > 0
        ? `Disrupted now: ${plainList(DISRUPTED_EDGE_IDS.map((id) => EDGE_BY_ID[id].name))}. ${cautionUsed.length} feeding ${plural(cautionUsed.length, "road is", "roads are")} on caution.`
        : `No road is disrupted now. ${cautionUsed.length} feeding ${plural(cautionUsed.length, "road is", "roads are")} on caution.`,
      incidents: `${incidents.length} open incident reports region-wide. Only roads that feed these depots were checked.`,
      risk: `Stock cover of ${depots.length} depots, safe levels ${goods.map((g) => `${GOOD_BY_ID[g].label.toLowerCase()} ${GOOD_BY_ID[g].safeDays} d`).join(", ")}.`,
    }),
    trace: [
      `Scope: ${goods.length} ${plural(goods.length, "good", "goods")}, ${depots.length} ${plural(depots.length, "depot", "depots")}${state ? ` in ${state}` : ""}.`,
      `Closed the roads that are disrupted now (${DISRUPTED_EDGE_IDS.length}) for 72 hours and read depot stock.`,
      `Stress-tested ${usedEdges.size} feeding roads, closing each alone for 72 hours.`,
    ],
    notes: ["Assumes disrupted roads stay closed for 72 hours.", "Stock levels and consumption are sample data."],
    map: { key: `supply-${state ?? "all"}-${goods.join("")}`, routes, points, bounds: boundsOfPoints(depots.map((d) => d.pos), 0.5) },
  };
}

// ---------------------------------------------------------------- road status

export function answerStatus(q: ParsedQuery): Draft {
  const hubIds = [q.origin, q.destination]
    .filter((m): m is NonNullable<typeof m> => m !== null && m.place.kind !== "state")
    .map((m) => m.place.hubId);
  const uniqueHubs = Array.from(new Set(hubIds));
  const state = q.stateMatch ? q.stateMatch.place.state : null;

  let edgeIds: string[] = [];
  let scopeText = "roads that need attention";
  if (uniqueHubs.length >= 2) {
    const direct = EDGES.filter((e) => uniqueHubs.includes(e.from) && uniqueHubs.includes(e.to)).map((e) => e.id);
    const route = direct.length > 0 ? null : planRoute(uniqueHubs[0], uniqueHubs[1], "fast");
    edgeIds = direct.length > 0 ? direct : route ? route.edgeIds : [];
    scopeText = `${hubById[uniqueHubs[0]].name} to ${hubById[uniqueHubs[1]].name}`;
  } else if (uniqueHubs.length === 1) {
    edgeIds = EDGES.filter((e) => e.from === uniqueHubs[0] || e.to === uniqueHubs[0]).map((e) => e.id);
    scopeText = `roads at ${hubById[uniqueHubs[0]].name}`;
  } else if (state) {
    edgeIds = EDGES.filter((e) => EDGE_CONTEXT[e.id].states.includes(state)).map((e) => e.id);
    scopeText = `roads in ${state}`;
  } else {
    edgeIds = EDGES.filter((e) => EDGE_CONTEXT[e.id].status !== "clear").map((e) => e.id);
  }
  if (edgeIds.length === 0) return needMore("status", "Road status", "I could not find a modelled road for that. Try naming two towns, for example: status of the Silchar to Imphal road.");

  const ctxs = edgeIds.map((id) => EDGE_CONTEXT[id]);
  const disrupted = ctxs.filter((c) => c.status === "disrupted");
  const caution = ctxs.filter((c) => c.status === "caution");
  const level = disrupted.length > 0 ? "High" : caution.length > 0 ? "Moderate" : "Low";

  const cards: RecommendationCard[] = [];
  const alternatives: TransportOption[] = [];
  for (const c of [...disrupted, ...caution].slice(0, 3)) {
    const alt = planRoute(c.edge.from, c.edge.to, "safe", new Set([c.edge.id]));
    const corridor = corridors.find((x) => x.id === c.edge.corridorId);
    if (c.status === "disrupted") {
      cards.push({
        id: `status-${c.edge.id}`,
        category: "Route",
        priority: "Now",
        action: alt
          ? `Hold freight on ${c.edge.name} and reroute via ${alt.nodeIds.map((id) => hubById[id].name).join(", ")} (${alt.km} km).`
          : `Hold freight on ${c.edge.name}. No other road links its ends, so plan air dispatch for urgent cargo.`,
        outcome: alt
          ? `Avoids the closure at a cost of ${Math.round(alt.km - c.edge.lengthKm)} km extra. ${corridor ? corridor.advisory : ""}`
          : `Protects ${fmt(populationOf(DEPENDENTS[c.edge.id] ?? []))} village residents who rely on this road for care and supplies.`,
        confidence: confidence(82, [{ label: "road status is a sample feed", delta: -6 }], ["Corridor status and advisory."]),
      });
      if (alt) {
        alternatives.push({
          mode: `Road detour via ${alt.nodeIds.slice(1, -1).map((id) => hubById[id].name).join(", ") || "another link"}`,
          suitability: alt.km > 350 ? "Possible" : "Best",
          time: hoursLabel(alt.hours),
          note: `${alt.km} km, risk index ${alt.riskIndex}. ${alt.km > 350 ? "A long detour, suits urgent cargo only." : ""}`,
        });
      }
    } else {
      cards.push({
        id: `status-${c.edge.id}`,
        category: "Route",
        priority: "Today",
        action: `Allow extra time on ${c.edge.name} and read the advisory before dispatch.${corridor ? ` ${corridor.advisory}` : ""}`,
        outcome: "Lowers the chance of an unplanned halt on this stretch.",
        confidence: confidence(78, [{ label: "road status is a sample feed", delta: -6 }], ["Corridor status and advisory."]),
      });
    }
  }
  if (cards.length === 0) {
    cards.push({
      id: "status-clear",
      category: "Route",
      priority: "Watch",
      action: `Proceed as planned. ${ctxs.map((c) => c.edge.name).slice(0, 3).join(", ")} ${ctxs.length === 1 ? "is" : "are"} clear.`,
      outcome: "No delay is expected from road status.",
      confidence: confidence(80, [{ label: "road status is a sample feed", delta: -6 }], ["Corridor status."]),
    });
  }
  alternatives.push({
    mode: "Air or helicopter",
    suitability: disrupted.length > 0 ? "Possible" : "Not advised",
    time: "About 6 to 12 h",
    note: "For medicines and urgent cargo when no road option works.",
  });

  const allInc = ctxs.flatMap((c) => c.incidents);
  const routes: MapRoute[] = ctxs.map((c) => ({ path: c.edge.path, kind: "highlight", label: `${c.edge.name}: ${c.status}`, color: STATUS_COLOR[c.status] }));
  const points: MapPoint[] = allInc.map((i) => ({ pos: i.pos, label: `${i.type}: ${i.title}`, kind: "incident", color: "#b0432f", permanent: false }));
  const allPos: LatLng[] = ctxs.flatMap((c) => c.edge.path);
  const weatherMax = ctxs.reduce((m, c) => Math.max(m, c.weather), 0);
  const areaBest = ctxs.reduce((b, c) => (c.areaScore > b.score ? { score: c.areaScore, name: c.areaDistrict } : b), { score: 0, name: "" });

  return {
    intent: "status",
    intentLabel: "Road status",
    title: `Road status, ${scopeText}`,
    assessment: {
      level,
      score: null,
      headline:
        disrupted.length > 0
          ? `${disrupted.length} of ${ctxs.length} ${plural(ctxs.length, "road", "roads")} in scope ${disrupted.length === 1 ? "is" : "are"} disrupted.`
          : caution.length > 0
            ? `${caution.length} of ${ctxs.length} ${plural(ctxs.length, "road", "roads")} in scope ${caution.length === 1 ? "is" : "are"} on caution. None is closed.`
            : `All ${ctxs.length} ${plural(ctxs.length, "road", "roads")} in scope ${ctxs.length === 1 ? "is" : "are"} clear.`,
      points: ctxs.slice(0, 6).map((c) => {
        const villages = DEPENDENTS[c.edge.id]?.size ?? 0;
        const lines = LINES_BY_EDGE[c.edge.id]?.length ?? 0;
        return `${c.edge.name}, ${Math.round(c.edge.lengthKm)} km: ${c.status}. ${villages} villages and ${lines} supply lines depend on it.`;
      }),
    },
    cards,
    alternatives,
    context: buildContext({
      routes: `Corridor status: ${disrupted.length} disrupted, ${caution.length} caution, ${ctxs.length - disrupted.length - caution.length} clear in scope.`,
      incidents: allInc.length > 0 ? `${allInc.length} open incident report${allInc.length === 1 ? "" : "s"}: ${plainList(allInc.map((i) => i.title.toLowerCase()))}.` : "No open incident reports on these roads.",
      weather: `Weather severity up to ${Math.round(weatherMax)} (${weatherLabel(weatherMax)}) near these roads.`,
      risk: areaBest.score > 0 ? `Highest district score nearby: ${areaBest.name}, ${areaBest.score}.` : "No district score nearby.",
    }),
    trace: [
      `Matched ${ctxs.length} modelled ${plural(ctxs.length, "road", "roads")} for "${scopeText}".`,
      "Read corridor status, advisory and incident reports.",
      "Looked for a detour that avoids each disrupted road.",
    ],
    notes: [],
    map: { key: `status-${edgeIds.join(",")}`, routes, points, bounds: boundsOfPoints(allPos, 0.3) },
  };
}

// ---------------------------------------------------------------- village isolation

export function answerIsolation(q: ParsedQuery): Draft {
  const hubIds = Array.from(
    new Set(
      [q.origin, q.destination]
        .filter((m): m is NonNullable<typeof m> => m !== null && m.place.kind !== "state")
        .map((m) => m.place.hubId)
    )
  );
  const criticality = (id: string) => populationOf(DEPENDENTS[id] ?? []);
  let candidates = EDGES.map((e) => e.id);
  let chosenBy = "the road that the most village residents depend on";
  if (hubIds.length >= 2) {
    const direct = EDGES.filter((e) => hubIds.includes(e.from) && hubIds.includes(e.to)).map((e) => e.id);
    if (direct.length > 0) {
      candidates = direct;
      chosenBy = "the road you named";
    }
  } else if (hubIds.length === 1) {
    const near = EDGES.filter((e) => e.from === hubIds[0] || e.to === hubIds[0]).map((e) => e.id);
    if (near.length > 0) {
      candidates = near;
      chosenBy = `the busiest road at ${hubById[hubIds[0]].name}`;
    }
  }
  const edgeId = [...candidates].sort((a, b) => criticality(b) - criticality(a))[0];
  const edge = EDGE_BY_ID[edgeId];
  const len = edge.lengthKm;
  const blockLen = Math.min(Math.floor(len), Math.min(80, Math.max(10, Math.round((len * 0.3) / 5) * 5)));
  const result = simulate({ edgeId, startKm: Math.max(0, len / 2 - blockLen / 2), endKm: Math.min(len, len / 2 + blockLen / 2) });
  const advice = isolationAdvice(result);
  const adjustments = [{ label: "village database and positions are sample data", delta: -8 }];
  const basis = ["Village access model with a blockage of a stretch of the road."];

  const cards: RecommendationCard[] = [];
  const pick = (start: string) => advice.find((a) => a.startsWith(start));
  const supplies = pick("Deploy");
  if (supplies) cards.push({ id: "iso-supplies", category: "Villages", priority: "Now", action: supplies, outcome: `Reaches ${result.atRiskCount} at-risk ${plural(result.atRiskCount, "village", "villages")} while a road still reaches them.`, confidence: confidence(72, adjustments, basis) });
  const airlift = pick("Plan airlift");
  if (airlift) cards.push({ id: "iso-airlift", category: "Villages", priority: "Now", action: airlift, outcome: `Reaches ${fmt(result.populationIsolated)} people who would have no road to a hospital.`, confidence: confidence(70, adjustments, basis) });
  const medical = pick("Pre-position");
  if (medical) cards.push({ id: "iso-medical", category: "Medical", priority: "Today", action: medical, outcome: "Keeps emergency care within reach of cut-off villages.", confidence: confidence(66, adjustments, basis) });
  const clearing = pick("Prioritise");
  if (clearing) cards.push({ id: "iso-clear", category: "Route", priority: "Today", action: clearing, outcome: `Restores access for ${fmt(result.populationImpacted)} people.`, confidence: confidence(74, adjustments, basis) });
  if (cards.length === 0) {
    cards.push({ id: "iso-none", category: "Villages", priority: "Watch", action: advice[0] ?? "No action needed.", outcome: "No village loses emergency access from this blockage.", confidence: confidence(74, adjustments, basis) });
  }

  const alternatives: TransportOption[] = [];
  if (result.detour) {
    alternatives.push({ mode: `Road detour (Route B) via ${result.detour.nodeIds.slice(1, -1).map((id) => hubById[id].name).join(", ") || "another link"}`, suitability: result.detour.km > 350 ? "Possible" : "Best", time: hoursLabel(result.detour.km / 35), note: `${result.detour.km} km, ${result.detour.extraKm} km longer than the blocked road.` });
  }
  alternatives.push({ mode: "Air or helicopter", suitability: result.isolatedCount > 0 ? "Best" : "Possible", time: "About 6 to 12 h", note: "For isolated villages and medical evacuation." });
  if (result.isolatedCount > 0) alternatives.push({ mode: "Foot-carry from the nearest working road", suitability: "Possible", time: "Depends on distance", note: `Nearest working road is ${result.nearestAlternativeKm !== null ? result.nearestAlternativeKm.toFixed(1) : "unknown"} km from the closest isolated village.` });

  const affected = result.impacts
    .filter((i) => i.state === "isolated" || i.state === "at-risk")
    .sort((a, b) => VILLAGE_BY_ID[b.villageId].population - VILLAGE_BY_ID[a.villageId].population)
    .slice(0, 12);
  const points: MapPoint[] = affected.map((i) => ({ pos: VILLAGE_BY_ID[i.villageId].pos, label: `${VILLAGE_BY_ID[i.villageId].name}: ${i.state === "isolated" ? "isolated" : "at risk"}`, kind: "village", color: i.state === "isolated" ? "#b0432f" : "#e2842a", permanent: false }));
  const routes: MapRoute[] = [{ path: edge.path, kind: "highlight", label: `${edge.name} (tested blockage)`, color: "#b0432f" }];

  return {
    intent: "isolation",
    intentLabel: "Village isolation",
    title: `Village isolation, ${edge.name}`,
    assessment: {
      level: result.medicalRisk,
      score: null,
      headline: `If ${blockLen} km of the ${edge.name} road were blocked, ${result.affectedCount} ${plural(result.affectedCount, "village", "villages")} (${fmt(result.populationImpacted)} people) would lose normal access. Medical access risk: ${result.medicalRisk}.`,
      points: [
        `${result.isolatedCount} isolated (${fmt(result.populationIsolated)} people) and ${result.atRiskCount} at risk (${fmt(result.populationAtRisk)} people).`,
        result.detour ? `Route B: ${result.detour.nodeIds.map((id) => hubById[id].name).join(" to ")}, ${result.detour.km} km.` : "No other road links the two ends of this road.",
        `Tested ${chosenBy}, blocked at its midpoint.`,
      ],
    },
    cards,
    alternatives,
    context: buildContext({
      routes: `Tested ${edge.name}, current corridor status ${EDGE_CONTEXT[edge.id].status}.`,
      risk: "Village access model: hospital and supply depot distances by road.",
    }),
    trace: [
      `Chose ${edge.name} as ${chosenBy}.`,
      `Blocked ${blockLen} km at the midpoint and recalculated every village's route to a hospital and a supply depot.`,
    ],
    notes: ["This is a what-if test, not a reported closure."],
    map: { key: `iso-${edgeId}`, routes, points, bounds: boundsOfPoints(edge.path, 0.3) },
  };
}

// ---------------------------------------------------------------- situation briefing

export function answerSituation(q: ParsedQuery): Draft {
  const state = q.stateMatch ? q.stateMatch.place.state : null;
  const scopeDistricts = state ? DISTRICT_RISKS.filter((d) => d.state === state) : DISTRICT_RISKS;
  const scopeEdges = EDGES.filter((e) => !state || EDGE_CONTEXT[e.id].states.includes(state));
  const disrupted = scopeEdges.filter((e) => EDGE_CONTEXT[e.id].status === "disrupted");
  const caution = scopeEdges.filter((e) => EDGE_CONTEXT[e.id].status === "caution");
  const scopeIncidents = scopeEdges.flatMap((e) => EDGE_CONTEXT[e.id].incidents);
  const top = [...scopeDistricts].sort((a, b) => b.score - a.score).slice(0, 3);
  const wettest = [...scopeDistricts].sort((a, b) => b.factors.weather - a.factors.weather)[0];
  const states = state ? [state] : Array.from(new Set(scopeDistricts.map((d) => d.state)));
  const peak = states.map((s) => ({ s, ...weatherPeak(s) })).sort((a, b) => b.delta - a.delta)[0];
  if (!top[0]) return needMore("situation", "Situation briefing", "I have no data for that region.");

  const topLevel = levelFromCategory(categoryOf(top[0].score));
  const roadLevel = disrupted.length >= 2 ? "High" : disrupted.length === 1 ? "Moderate" : "Low";
  const order = ["Low", "Moderate", "High", "Critical"];
  const level = order.indexOf(topLevel) >= order.indexOf(roadLevel) ? topLevel : roadLevel;

  const current = analyse(DISRUPTED_EDGE_IDS, 72);
  const hitDepots = current.affectedDepotIds.filter((id) => !state || hubById[id].state === state);
  const adjustments = [{ label: "all four feeds are sample data", delta: -6 }];
  const cards: RecommendationCard[] = [];

  if (disrupted.length > 0) {
    cards.push({
      id: "sit-roads",
      category: "Route",
      priority: "Now",
      action: `Hold freight on ${plainList(disrupted.map((e) => e.name))} and use the safest alternative route.`,
      outcome: `Avoids ${disrupted.length} closed ${plural(disrupted.length, "road", "roads")}. Ask me for the safest route between the two ends.`,
      confidence: confidence(82, adjustments, ["Corridor status feed."]),
    });
  } else {
    cards.push({
      id: "sit-roads",
      category: "Route",
      priority: "Watch",
      action: `Keep normal dispatch. No road${state ? ` in ${state}` : ""} is closed${caution.length > 0 ? `; ${caution.length} ${plural(caution.length, "is", "are")} on caution` : ""}.`,
      outcome: "No delay is expected from road closures.",
      confidence: confidence(80, adjustments, ["Corridor status feed."]),
    });
  }
  if (peak && peak.delta >= 8) {
    cards.push({
      id: "sit-weather",
      category: "Weather",
      priority: "Today",
      action: `Brief drivers and depots in ${peak.s}. Weather severity is expected to rise by ${peak.delta} points within ${peak.hours} hours.`,
      outcome: "Earlier departures avoid the worst conditions on hill roads.",
      confidence: confidence(64, [{ label: "weather outlook is a state-level estimate", delta: -4 }], ["Weather outlook from the risk model."]),
    });
  }
  cards.push({
    id: "sit-risk",
    category: "Risk",
    priority: "Today",
    action: FACTOR_ACTION[top[0].mainFactor](top[0].name),
    outcome: `Reduces exposure in the highest-risk district, score ${top[0].score}.`,
    confidence: confidence(78, adjustments, ["District risk scores."]),
  });
  if (hitDepots.length > 0) {
    cards.push({
      id: "sit-supply",
      category: "Supply",
      priority: "Now",
      action: `Check stock at ${plainList(hitDepots.map((id) => DEPOT_BY_ID[id].name))}. Their supply roads are disrupted.`,
      outcome: "Finds shortages before they reach the safe threshold. Ask me for the supply risk by good.",
      confidence: confidence(66, adjustments, ["Supply model with disrupted roads closed for 72 hours."]),
    });
  }

  const routes: MapRoute[] = [...disrupted, ...caution].map((e) => ({
    path: e.path, kind: "highlight", label: `${e.name}: ${EDGE_CONTEXT[e.id].status}`, color: STATUS_COLOR[EDGE_CONTEXT[e.id].status],
  }));
  const points: MapPoint[] = [
    ...top.map((d): MapPoint => ({ pos: d.pos, label: `${d.name}: ${d.score}`, kind: "district", color: scoreColor(d.score), permanent: true })),
    ...scopeIncidents.map((i): MapPoint => ({ pos: i.pos, label: `${i.type}: ${i.title}`, kind: "incident", color: "#b0432f", permanent: false })),
  ];

  return {
    intent: "situation",
    intentLabel: "Situation briefing",
    title: `Situation briefing${state ? `, ${state}` : ""}`,
    assessment: {
      level: level as "Low" | "Moderate" | "High" | "Critical",
      score: top[0].score,
      headline: `${disrupted.length} disrupted and ${caution.length} caution ${plural(disrupted.length + caution.length, "road", "roads")}, ${scopeIncidents.length} open ${plural(scopeIncidents.length, "incident", "incidents")}. Highest-risk district: ${top[0].name}, ${top[0].score} (${CATEGORY[categoryOf(top[0].score)].label}).`,
      points: [
        `Top districts: ${top.map((d) => `${d.name} ${d.score}`).join(", ")}.`,
        wettest ? `Highest weather severity: ${wettest.name}, ${wettest.factors.weather} (${weatherLabel(wettest.factors.weather)}).` : "",
        peak ? `Largest expected weather rise: +${peak.delta} in ${peak.s} within ${peak.hours} hours.` : "",
        hitDepots.length > 0 ? `${hitDepots.length} ${plural(hitDepots.length, "depot has", "depots have")} a supply road that is disrupted.` : "No depot has a disrupted supply road.",
      ].filter(Boolean),
    },
    cards,
    alternatives: [],
    context: buildContext({
      weather: wettest ? `Highest severity ${wettest.name} ${wettest.factors.weather}. Largest expected rise +${peak?.delta ?? 0} in ${peak?.s ?? "the region"}.` : "No weather data in scope.",
      routes: `${disrupted.length} disrupted, ${caution.length} caution, ${scopeEdges.length - disrupted.length - caution.length} clear.`,
      incidents: scopeIncidents.length > 0 ? `${scopeIncidents.length} open: ${plainList(scopeIncidents.map((i) => i.title.toLowerCase()))}.` : "No open incident reports in scope.",
      risk: `${scopeDistricts.length} districts scored. Highest ${top[0].name}, ${top[0].score}.`,
    }),
    trace: ["Read all four feeds for the scope.", "Combined road status, incident reports, district scores and weather outlook into one briefing."],
    notes: [],
    map: { key: `sit-${state ?? "all"}`, routes, points, bounds: boundsOfPoints([...scopeEdges.flatMap((e) => e.path)], 0.2) },
  };
}

// ---------------------------------------------------------------- help

export const SUGGESTIONS = [
  "Safest route from Guwahati to Tawang",
  "Which district is most vulnerable today?",
  "Show medicine supply risks in Assam",
  "Status of the Silchar to Imphal road",
  "Which villages could be isolated if the Shillong to Tura road is blocked?",
  "Give me the situation briefing for Meghalaya",
];

export function answerHelp(): Draft {
  return {
    intent: "help",
    intentLabel: "Help",
    title: "I could not match that question",
    assessment: {
      level: "Low",
      score: null,
      headline: "I can answer questions about routes, district vulnerability, supply risk, road status, village isolation and the overall situation.",
      points: SUGGESTIONS.map((s) => `Try: ${s}`),
    },
    cards: [],
    alternatives: [],
    context: buildContext({}),
    trace: ["No intent scored above zero and no place name was found."],
    notes: ["Name a place, a good (medicines, food, LPG, fuel, relief) or a road to get a specific answer."],
    map: { key: "help", routes: [], points: [], bounds: null },
  };
}

export { GOODS };
