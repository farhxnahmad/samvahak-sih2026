import { hubById } from "../data";
import { fmt } from "../format";
import { haversineKm, pathLengthKm } from "../geo";
import { nearestOnPath } from "../isolation/geometry";
import { DISTRICT_RISKS } from "../risk/engine";
import { CATEGORY, categoryOf, clamp } from "../risk/model";
import { CORRIDOR_BY_ID, EDGE_CONTEXT, hoursLabel, weatherLabel, weatherPeak } from "./context";
import { confidence, type Adjustment } from "./confidence";
import { getPlace, type Place } from "./places";
import type { ParsedQuery } from "./parse";
import { planRoute, routePath, type PlannedRoute } from "./planner";
import type { CopilotResponse, MapHighlight, MapPoint, MapRoute, RecommendationCard, TransportOption } from "./types";
import { boundsOfPoints, buildContext, levelFromRisk, plainList } from "./utils";
import { EDGE_BY_ID } from "../isolation/network";

export type Draft = Omit<CopilotResponse, "id" | "query" | "understood">;

const OFF_ROAD_SPEED_KMH = 25;

function legKm(place: Place): number {
  return place.hubKm > 15 ? Math.round(place.hubKm * 1.5) : 0;
}

function legRisk(place: Place): number {
  if (place.kind === "district") {
    const d = DISTRICT_RISKS.find((r) => `district:${r.id}` === place.id);
    return d ? clamp((d.score - 35) * 0.9, 0, 60) : 20;
  }
  return place.kind === "state" ? 25 : 20;
}

export function needMore(intent: Draft["intent"], intentLabel: string, message: string): Draft {
  return {
    intent,
    intentLabel,
    title: "More detail needed",
    assessment: { level: "Low", score: null, headline: message, points: [] },
    cards: [],
    alternatives: [],
    context: buildContext({}),
    trace: ["The question did not contain enough to answer."],
    notes: [],
    map: { key: `need-${intent}`, routes: [], points: [], bounds: null },
  };
}

function waterwayKm(fromHub: string, toHub: string): number | null {
  const corridor = CORRIDOR_BY_ID["brahmaputra-waterway"];
  if (!corridor || fromHub === toHub) return null;
  const a = nearestOnPath(hubById[fromHub].pos, corridor.path);
  const b = nearestOnPath(hubById[toHub].pos, corridor.path);
  if (a.distKm > 40 || b.distKm > 40) return null;
  const total = pathLengthKm(corridor.path);
  return Math.round(Math.abs(a.fraction - b.fraction) * total * 1.15);
}

export function answerRoute(q: ParsedQuery): Draft {
  const dest = q.destination?.place ?? q.stateMatch?.place ?? null;
  if (!dest) return needMore("route", "Route planning", "Tell me where the vehicle is going, for example: safest route from Guwahati to Tawang.");

  const assumedOrigin = q.origin === null;
  const origin = q.origin?.place ?? (getPlace("guwahati") as Place);
  const notes: string[] = [];
  const trace: string[] = [];
  if (assumedOrigin) notes.push("No starting point was given, so Guwahati hub is assumed.");
  for (const m of [q.origin, q.destination]) {
    if (m && m.fuzzy) notes.push(`Read "${m.text}" as ${m.place.name}.`);
  }

  const same = origin.hubId === dest.hubId;
  const empty: PlannedRoute = {
    nodeIds: [origin.hubId], edgeIds: [], km: 0, hours: 0, riskIndex: 0, worst: null, incidents: [], states: [origin.state],
  };
  const safeR = same ? empty : planRoute(origin.hubId, dest.hubId, "safe");
  const fastR = same ? empty : planRoute(origin.hubId, dest.hubId, "fast");
  if (!safeR || !fastR) {
    return needMore("route", "Route planning", `No road path links ${origin.name} and ${dest.name} in the modelled network.`);
  }

  // Prefer a route that avoids roads that are disrupted right now, if one exists.
  const disruptedOn = (r: PlannedRoute) => r.edgeIds.filter((id) => EDGE_CONTEXT[id].status === "disrupted");
  let safeRoute = safeR;
  if (q.wantsSafest && !same && disruptedOn(safeR).length > 0) {
    const detour = planRoute(origin.hubId, dest.hubId, "safe", new Set(disruptedOn(safeR)));
    if (detour) {
      notes.push(`The direct road uses ${plainList(disruptedOn(safeR).map((id) => EDGE_BY_ID[id].name))}, which is disrupted, so a detour is recommended.`);
      safeRoute = detour;
    }
  }
  // "safe" is the route the officer asked for, "fast" is the other one to compare with.
  const safe = q.wantsSafest ? safeRoute : fastR;
  const fast = q.wantsSafest ? fastR : safeRoute;
  const askedFor = q.wantsSafest ? "safest" : "fastest";
  const otherName = q.wantsSafest ? "shortest" : "safest";
  const oLeg = legKm(origin);
  const dLeg = legKm(dest);
  const legs = oLeg + dLeg;
  const totalKm = safe.km + legs;
  const totalHours = safe.hours + legs / OFF_ROAD_SPEED_KMH;
  const blend = (route: PlannedRoute) => {
    const km = route.km + legs;
    return km > 0 ? Math.round((route.riskIndex * route.km + legRisk(origin) * oLeg + legRisk(dest) * dLeg) / km) : 0;
  };
  const risk = blend(safe);
  const fastRisk = blend(fast);
  const level = levelFromRisk(risk);
  const sameAsFast = fast.edgeIds.join() === safe.edgeIds.join();

  trace.push(`Origin: ${origin.name} (${origin.kind}${origin.hubKm > 15 ? `, ${Math.round(origin.hubKm)} km from ${hubById[origin.hubId].name} hub` : ""}).`);
  trace.push(`Destination: ${dest.name} (${dest.kind}${dest.hubKm > 15 ? `, ${Math.round(dest.hubKm)} km from ${hubById[dest.hubId].name} hub` : ""}).`);
  trace.push("Scored every road segment by corridor status, incident reports, district risk scores and weather severity.");
  trace.push("Chose the route by the officer's preference and compared it with the alternative.");

  const names = safe.nodeIds.map((id) => hubById[id].name);
  const routeText = same ? `${hubById[safe.nodeIds[0]].name} hub` : names.join(" to ");
  const legText =
    legs > 0
      ? `, plus about ${legs} km ${oLeg > 0 && dLeg > 0 ? "at both ends" : dLeg > 0 ? `to ${dest.name}` : `from ${origin.name}`} off the modelled network`
      : "";

  const adjustments: Adjustment[] = [];
  if (assumedOrigin) adjustments.push({ label: "starting point was assumed", delta: -5 });
  if (q.origin?.fuzzy || q.destination?.fuzzy) adjustments.push({ label: "a place name was matched by spelling", delta: -6 });
  if (legs > 0) adjustments.push({ label: `${legs} km is off the modelled road network and estimated`, delta: -12 });
  if (q.horizon > 0) adjustments.push({ label: `forecast ${q.horizon} hours ahead`, delta: -6 * (q.horizon / 24) });
  const basis = ["Route status, incident reports and risk scores from sample feeds."];

  const cards: RecommendationCard[] = [];
  const kmDiff = fast.km - safe.km;
  const riskDiff = fastRisk - risk;
  cards.push({
    id: "route-main",
    category: "Route",
    priority: "Now",
    action: `Send the convoy by the ${askedFor} road route: ${routeText}${legText}.`,
    outcome: `About ${fmt(totalKm)} km and ${hoursLabel(totalHours)} with a risk index of ${risk} (${level}).${
      sameAsFast
        ? ` This is also the ${otherName} road route.`
        : ` The ${otherName} road route is ${Math.abs(kmDiff)} km ${kmDiff < 0 ? "shorter" : "longer"} and ${Math.abs(riskDiff)} points ${riskDiff > 0 ? "riskier" : "less risky"}.`
    }`,
    confidence: confidence(84, adjustments, basis),
  });

  const stillDisrupted = disruptedOn(safe);
  if (stillDisrupted.length > 0) {
    cards[0] = {
      ...cards[0],
      action: `Hold non-urgent road dispatch on ${routeText}. It uses ${plainList(stillDisrupted.map((id) => EDGE_BY_ID[id].name))}, which is disrupted, and no road route avoids it.`,
      outcome: `Urgent cargo should go by air. If it must go by road, expect delays: route risk index ${risk} (${level}), about ${hoursLabel(totalHours)} if the road reopens.`,
    };
  }

  let peak = { state: "", hours: 24, delta: 0 };
  for (const s of new Set([...safe.states, dest.state, origin.state])) {
    const p = weatherPeak(s);
    if (p.delta > peak.delta) peak = { state: s, ...p };
  }
  if (peak.delta >= 8) {
    cards.push({
      id: "route-timing",
      category: "Timing",
      priority: "Today",
      action: `Depart today rather than later. Weather severity in ${peak.state} is forecast to rise by ${peak.delta} points within ${peak.hours} hours.`,
      outcome: `Keeps the leg through ${peak.state} ahead of the worst conditions.`,
      confidence: confidence(66, [{ label: "weather outlook is a state-level estimate", delta: -4 }], ["Weather outlook from the risk model."]),
    });
  }

  if (safe.incidents.length > 0) {
    const inc = safe.incidents[0];
    cards.push({
      id: "route-incident",
      category: "Incident",
      priority: "Now",
      action: `Confirm this is cleared before dispatch: ${inc.title.toLowerCase()} (${inc.type.toLowerCase()}).`,
      outcome: "Avoids an unplanned halt on the route.",
      confidence: confidence(72, [], ["Incident report attached to this road."]),
    });
  }

  if (!sameAsFast && q.wantsSafest && riskDiff >= 8) {
    cards.push({
      id: "route-avoid",
      category: "Route",
      priority: "Watch",
      action: `Avoid the shortest road route via ${fast.nodeIds.map((id) => hubById[id].name).join(", ")}.`,
      outcome: `Saves ${Math.max(0, -kmDiff)} km but carries ${riskDiff} more points of risk.`,
      confidence: confidence(78, adjustments, basis),
    });
  }

  if (level === "High" || level === "Critical" || dLeg > 60) {
    cards.push({
      id: "route-air",
      category: "Transport",
      priority: "Watch",
      action: `Prepare an air or helicopter option for ${dLeg > 60 ? `the last leg to ${dest.name}` : "urgent cargo"}.`,
      outcome: "Keeps medicines and urgent supplies moving if the road closes.",
      confidence: confidence(60, [{ label: "air capacity is not modelled", delta: -6 }], ["Route risk and remoteness."]),
    });
  }

  const alternatives: TransportOption[] = [];
  if (!sameAsFast) {
    const fastKm = fast.km + legs;
    alternatives.push({
      mode: `Road, ${otherName} route`,
      suitability: riskDiff >= 15 ? "Not advised" : "Possible",
      time: hoursLabel(fast.hours + legs / OFF_ROAD_SPEED_KMH),
      note: `${fmt(fastKm)} km, risk index ${fastRisk}. Via ${fast.nodeIds.map((id) => hubById[id].name).join(", ")}.`,
    });
  }
  const water = same ? null : waterwayKm(origin.hubId, dest.hubId);
  if (water !== null) {
    const wStatus = CORRIDOR_BY_ID["brahmaputra-waterway"].status;
    alternatives.push({
      mode: "Inland waterway, Brahmaputra",
      suitability: risk >= 65 ? "Best" : "Possible",
      time: hoursLabel(water / 12 + legs / OFF_ROAD_SPEED_KMH),
      note: `About ${water} km by river${legs > 0 ? `, then ${legs} km by road` : ""}. Suits bulk cargo. Waterway status is ${wStatus}; check vessel draft before loading.`,
    });
  }
  const airKm = Math.round(haversineKm(origin.pos, dest.pos));
  alternatives.push({
    mode: "Air or helicopter",
    suitability: airKm < 60 ? "Not advised" : risk >= 65 || dLeg > 60 ? "Best" : "Possible",
    time: hoursLabel(airKm / 200 + 2),
    note: `About ${airKm} km straight line including 2 hours for handling. Small loads only. Best for medicines and the last leg.`,
  });

  const routePoints: MapPoint[] = [
    { pos: origin.pos, label: origin.name, kind: "origin", color: "#17392a", permanent: true },
    { pos: dest.pos, label: dest.name, kind: "destination", color: "#2b7fa8", permanent: true },
  ];
  safe.incidents.forEach((i) => routePoints.push({ pos: i.pos, label: `${i.type}: ${i.title}`, kind: "incident", color: "#b0432f", permanent: false }));
  const routes: MapRoute[] = [];
  const safePath = routePath(safe);
  if (safePath.length > 1) routes.push({ path: safePath, kind: "safest", label: q.wantsSafest ? "Safest route" : "Fastest route", color: "#2f9d6a" });
  if (!sameAsFast) routes.push({ path: routePath(fast), kind: "fastest", label: q.wantsSafest ? "Shortest route" : "Safest route", color: "#8a7a55" });
  if (oLeg > 0) routes.push({ path: [origin.pos, hubPosOf(origin)], kind: "leg", label: "Off-network leg", color: "#d1861f" });
  if (dLeg > 0) routes.push({ path: [hubPosOf(dest), dest.pos], kind: "leg", label: "Off-network leg", color: "#d1861f" });
  const map: MapHighlight = {
    key: `route-${origin.id}-${dest.id}-${q.wantsSafest}`,
    routes,
    points: routePoints,
    bounds: boundsOfPoints([...safePath, origin.pos, dest.pos]),
  };

  const worstCtx = safe.worst ? EDGE_CONTEXT[safe.worst.edgeId] : null;
  const statusCounts = { clear: 0, caution: 0, disrupted: 0 };
  safe.edgeIds.forEach((id) => {
    statusCounts[EDGE_CONTEXT[id].status] += 1;
  });
  const areaMax = safe.edgeIds.reduce(
    (best, id) => (EDGE_CONTEXT[id].areaScore > best.score ? { score: EDGE_CONTEXT[id].areaScore, name: EDGE_CONTEXT[id].areaDistrict } : best),
    { score: 0, name: "" }
  );
  const weatherMax = safe.edgeIds.reduce((m, id) => Math.max(m, EDGE_CONTEXT[id].weather), 0);

  return {
    intent: "route",
    intentLabel: "Route planning",
    title: `Route, ${origin.name} to ${dest.name}`,
    assessment: {
      level,
      score: risk,
      headline: `The ${askedFor} route from ${origin.name} to ${dest.name} is about ${fmt(totalKm)} km and ${hoursLabel(totalHours)}, with a route risk index of ${risk} (${level}).`,
      points: [
        `Route: ${routeText}${legText}.`,
        worstCtx
          ? `Riskiest segment: ${worstCtx.edge.name}, risk ${worstCtx.risk}, road status ${worstCtx.status}.`
          : "No modelled road segment is used.",
        safe.incidents.length > 0
          ? `Open incidents on the route: ${plainList(safe.incidents.map((i) => i.title.toLowerCase()))}.`
          : "No open incident reports on the route.",
        dLeg > 0 ? `${dest.name} is ${Math.round(dest.hubKm)} km from ${hubById[dest.hubId].name} hub, the nearest modelled road point. That leg is estimated.` : "Both ends are on the modelled road network.",
      ],
    },
    cards,
    alternatives,
    context: buildContext({
      weather: `Weather severity up to ${Math.round(weatherMax)} (${weatherLabel(weatherMax)}) near the route. Largest expected rise: +${peak.delta} in ${peak.state || "the region"} within ${peak.hours} hours.`,
      routes: `Road status along the route: ${statusCounts.clear} clear, ${statusCounts.caution} caution, ${statusCounts.disrupted} disrupted.`,
      incidents: safe.incidents.length > 0 ? `${safe.incidents.length} open incident report${safe.incidents.length === 1 ? "" : "s"} on the route.` : "No open incident reports on the route.",
      risk: areaMax.score > 0 ? `Highest district score near the route: ${areaMax.name}, ${areaMax.score} (${CATEGORY[categoryOf(areaMax.score)].label}).` : "No district score near the route.",
    }),
    trace,
    notes,
    map,
  };
}

function hubPosOf(place: Place): import("../types").LatLng {
  return hubById[place.hubId].pos;
}

export { EDGE_BY_ID };
