import type { DistrictRisk } from "./engine";
import { scoreAt, type Horizon } from "./engine";
import {
  CATEGORY,
  FACTOR_KEYS,
  FACTOR_LABEL,
  categoryOf,
  pointsOf,
  WEIGHTS,
  type FactorKey,
} from "./model";

const RISE: Record<FactorKey, (value: number) => string> = {
  weather: (v) => (v >= 70 ? "heavy rainfall" : v >= 45 ? "worsening weather" : "changing weather"),
  incidents: (v) =>
    v >= 60 ? "multiple road blockage reports" : v >= 35 ? "road blockage reports" : "new road incident reports",
  congestion: () => "rising route congestion",
  history: () => "a pattern of repeated disruption",
};

const FALL: Record<FactorKey, string> = {
  weather: "weather conditions ease",
  incidents: "road incidents clear",
  congestion: "congestion eases",
  history: "past disruptions age out",
};

function joinPhrases(phrases: string[]): string {
  if (phrases.length <= 1) return phrases[0] ?? "";
  return `${phrases.slice(0, -1).join(", ")} and ${phrases[phrases.length - 1]}`;
}

// Factors whose weighted contribution moved the most in the last 24 hours.
function movers(d: DistrictRisk, direction: 1 | -1): FactorKey[] {
  return FACTOR_KEYS.map((key) => ({
    key,
    delta: (d.factors[key] - d.previous[key]) * WEIGHTS[key] * direction,
  }))
    .filter((m) => m.delta >= 1.5)
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 2)
    .map((m) => m.key);
}

export function risingPhrases(d: DistrictRisk): string[] {
  return movers(d, 1).map((key) => RISE[key](d.factors[key]));
}

export function districtInsights(d: DistrictRisk): string[] {
  const out: string[] = [];
  const abs = Math.abs(d.changePct);

  if (d.trend === "up") {
    const why = risingPhrases(d);
    out.push(
      why.length > 0
        ? `${d.name} risk increased by ${abs}% due to ${joinPhrases(why)}.`
        : `${d.name} risk increased by ${abs}%, mainly driven by ${FACTOR_LABEL[d.mainFactor].toLowerCase()}.`
    );
  } else if (d.trend === "down") {
    const why = movers(d, -1).map((key) => FALL[key]);
    out.push(
      why.length > 0
        ? `${d.name} risk decreased by ${abs}% as ${joinPhrases(why)}.`
        : `${d.name} risk decreased by ${abs}% over the last 24 hours.`
    );
  } else {
    out.push(
      `${d.name} risk is steady at ${d.score}, mainly driven by ${FACTOR_LABEL[d.mainFactor].toLowerCase()}.`
    );
  }

  out.push(
    `${FACTOR_LABEL[d.mainFactor]} is the largest contributor at ${pointsOf(d.factors, d.mainFactor)} of ${d.score} points.`
  );

  const future = d.forecast.filter((p) => p.horizon > 0);
  const peak = future.reduce((best, p) => (p.score > best.score ? p : best), future[0]);
  const last = future[future.length - 1];
  if (peak.score > d.score + 3) {
    out.push(`Forecast to reach ${peak.score} (${CATEGORY[peak.category].label}) within ${peak.horizon} hours.`);
  } else if (last.score < d.score - 3) {
    out.push(`Expected to ease to ${last.score} (${CATEGORY[last.category].label}) by 72 hours.`);
  } else {
    out.push(`Expected to stay near ${d.score} through the next 72 hours.`);
  }

  const worst = categoryOf(Math.max(d.score, peak.score));
  if (worst === "critical") {
    out.push("Hold non-essential freight and confirm route status before dispatch.");
  } else if (worst === "high") {
    out.push("Plan buffer time and keep an alternate route ready.");
  } else {
    out.push("Routine monitoring is enough for now.");
  }

  return out;
}

export function regionInsights(risks: DistrictRisk[], horizon: Horizon): string[] {
  const out: string[] = [];
  const when = horizon === 0 ? "right now" : `in ${horizon} hours`;

  const elevated = risks.filter((d) => scoreAt(d, horizon) > 60).length;
  out.push(`${elevated} of ${risks.length} districts are High or Critical ${when}.`);

  const riser = [...risks].sort((a, b) => b.changePct - a.changePct)[0];
  if (riser && riser.changePct >= 3) {
    const lead = risingPhrases(riser)[0] ?? FACTOR_LABEL[riser.mainFactor].toLowerCase();
    out.push(`${riser.name} has the sharpest rise, up ${riser.changePct}% in 24 hours, led by ${lead}.`);
  }

  const newlyCritical = risks.filter(
    (d) => d.score <= 80 && d.forecast.some((p) => p.horizon > 0 && p.score > 80)
  );
  if (newlyCritical.length > 0) {
    const byState: Record<string, number> = {};
    newlyCritical.forEach((d) => {
      byState[d.state] = (byState[d.state] ?? 0) + 1;
    });
    const topState = Object.entries(byState).sort((a, b) => b[1] - a[1])[0][0];
    out.push(
      `${newlyCritical.length} ${newlyCritical.length === 1 ? "district is" : "districts are"} forecast to reach Critical within 72 hours, most of them in ${topState}.`
    );
  } else {
    out.push("No district is forecast to newly reach Critical within 72 hours.");
  }

  return out;
}
