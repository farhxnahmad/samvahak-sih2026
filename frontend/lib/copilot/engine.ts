import { GOOD_BY_ID } from "../supply/goods";
import { answerDistrict, answerHelp, answerIsolation, answerSituation, answerStatus, answerSupply, SUGGESTIONS } from "./answers";
import { answerRoute, type Draft } from "./answerRoute";
import { parseQuery, type ParsedQuery } from "./parse";
import type { CopilotResponse, IntentId } from "./types";

export { SUGGESTIONS };

let counter = 0;

function dispatch(q: ParsedQuery): Draft {
  const handlers: Record<IntentId, () => Draft> = {
    route: () => answerRoute(q),
    district: () => answerDistrict(q),
    supply: () => answerSupply(q),
    status: () => answerStatus(q),
    isolation: () => answerIsolation(q),
    situation: () => answerSituation(q),
    help: () => answerHelp(),
  };
  return handlers[q.intent]();
}

// Turns a question into a briefing. Runs entirely in the browser over the platform's own
// data, so it needs no network and no model.
export function ask(raw: string): CopilotResponse {
  const q = parseQuery(raw);
  const draft = dispatch(q);

  const understood: CopilotResponse["understood"] = [{ label: "Question type", value: draft.intentLabel }];
  if (draft.intent === "route") {
    understood.push({ label: "From", value: q.origin ? q.origin.place.name : "Guwahati (assumed)" });
    const dest = q.destination ?? q.stateMatch;
    if (dest) understood.push({ label: "To", value: dest.place.name });
  } else {
    const named = q.places.filter((p) => p.place.kind !== "state").map((p) => p.place.name);
    if (named.length > 0) understood.push({ label: "Places", value: named.join(", ") });
  }
  if (q.stateMatch && draft.intent !== "route") understood.push({ label: "Region", value: q.stateMatch.place.name });
  if (q.goods.length > 0) understood.push({ label: "Goods", value: q.goods.map((g) => GOOD_BY_ID[g].label).join(", ") });
  understood.push({ label: "Time", value: q.horizon === 0 ? "Now" : `${q.horizon} hours ahead` });

  const ranked = (Object.keys(q.scores) as IntentId[])
    .filter((k) => k !== "help" && q.scores[k] > 0)
    .sort((a, b) => q.scores[b] - q.scores[a])
    .map((k) => `${k} ${q.scores[k]}`)
    .join(", ");

  counter += 1;
  return {
    ...draft,
    id: `q${counter}`,
    query: raw.trim(),
    understood,
    trace: [`Read the question as "${draft.intentLabel}"${ranked ? ` (scores: ${ranked})` : ""}.`, ...draft.trace],
  };
}
