import { fmt } from "../format";
import { hubById } from "../data";
import { EDGE_BY_ID } from "../isolation/network";
import { DEPOT_BY_ID } from "./depots";
import { GOOD_BY_ID, GOOD_IDS } from "./goods";
import { RISK_ORDER, type LineImpact, type SupplyAnalysis } from "./model";

function hubName(id: string): string {
  return hubById[id]?.name ?? id;
}

function sentenceFor(item: LineImpact): string {
  const good = GOOD_BY_ID[item.goodId];
  const depot = DEPOT_BY_ID[item.depotId];
  const parts: string[] = [];

  if (item.hoursToThreshold !== null) {
    parts.push(`${good.label} stock at ${depot.name} may fall below the safe threshold in ${item.hoursToThreshold} hours.`);
  } else {
    parts.push(`${good.label} supply to ${depot.name} is delayed.`);
  }
  if (item.hoursToStockout !== null && item.hoursToStockout <= 72) {
    parts.push(`It could run out in ${item.hoursToStockout} hours.`);
  }

  const c = item.chosen;
  if (c === null) {
    parts.push("No road route is open. Plan an air dispatch and protect health facilities first.");
  } else if (c.kind === "reroute") {
    const detour = c.extraKm > 250 ? ` The detour is ${c.km} km, so allow about ${Math.round(c.leadHours)} hours.` : "";
    parts.push(`Dispatch from ${hubName(c.fromId)} hub via ${c.nodeIds.map(hubName).join(" to ")}.${detour}`);
  } else {
    parts.push(`Transfer from ${DEPOT_BY_ID[c.fromId].name}, ${c.km} km away.`);
  }
  return parts.join(" ");
}

export function recommendations(analysis: SupplyAnalysis): string[] {
  const risky = analysis.items
    .filter((i) => i.affected && RISK_ORDER.indexOf(i.risk) >= RISK_ORDER.indexOf("High"))
    .sort((a, b) => {
      const byRisk = RISK_ORDER.indexOf(b.risk) - RISK_ORDER.indexOf(a.risk);
      if (byRisk !== 0) return byRisk;
      return (a.hoursToThreshold ?? 999) - (b.hoursToThreshold ?? 999);
    });

  if (analysis.affectedDepotIds.length === 0) {
    return ["No depot depends on this road for essential goods. No action needed."];
  }

  const out: string[] = [];
  const seenGoods = new Set<string>();
  for (const item of risky) {
    if (seenGoods.has(item.goodId)) continue;
    seenGoods.add(item.goodId);
    out.push(sentenceFor(item));
    if (out.length === 4) break;
  }

  if (out.length === 0) {
    out.push("Stock stays above safe levels through the outlook. Keep monitoring the closure.");
  }

  const edge = EDGE_BY_ID[analysis.edgeId];
  out.push(
    `Prioritise reopening the ${edge.name} road. It restores supply to ${analysis.affectedDepotIds.length} ${analysis.affectedDepotIds.length === 1 ? "depot" : "depots"} serving ${fmt(analysis.people)} people.`
  );
  return out;
}

export { GOOD_IDS };
