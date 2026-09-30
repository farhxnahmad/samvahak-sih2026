import type { GoodId } from "../supply/goods";
import type { IntentId } from "./types";
import { findPlaces, normalize, type PlaceMatch } from "./places";

export interface ParsedQuery {
  raw: string;
  text: string;
  intent: IntentId;
  scores: Record<IntentId, number>;
  places: PlaceMatch[];
  origin: PlaceMatch | null;
  destination: PlaceMatch | null;
  goods: GoodId[];
  horizon: 0 | 24 | 48 | 72;
  count: number | null;
  stateMatch: PlaceMatch | null;
  wantsSafest: boolean;
}

type Rule = [RegExp, number];

const RULES: Record<Exclude<IntentId, "help">, Rule[]> = {
  route: [
    [/\b(route|routes|road to|way to|path|travel|drive|reach|fastest|safest|shortest|journey|convoy|get to|go to)\b/, 3],
    [/\bfrom\b.+\bto\b/, 3],
  ],
  district: [
    [/\b(vulnerab\w*|most at risk|highest risk|riskiest|most critical|most dangerous|worst hit|worst affected)\b/, 4],
    [/\bwhich (district|districts|area|areas|region)\b/, 3],
    [/\bdistricts?\b/, 1],
  ],
  supply: [
    [/\b(supply|supplies|stock|stocks|inventory|depot|depots|shortage|shortages|running out|deplet\w*|cover)\b/, 4],
    [/\b(medicine|medicines|medical|drugs?|pharma\w*|food|rice|grain|lpg|gas|cylinders?|fuel|petrol|diesel|relief)\b/, 2],
  ],
  status: [
    [/\b(status|open|closed|blocked|condition|passable|motorable|clear)\b/, 3],
    [/\b(road|highway|corridor)\b/, 1],
  ],
  isolation: [
    [/\b(isolat\w*|cut off|stranded|inaccessible|marooned)\b/, 7],
    [/\bvillages?\b/, 3],
  ],
  situation: [
    [/\b(situation|briefing|brief|summary|overview|update|weather|rain|rainfall|incident|incidents|alert|alerts|reports?)\b/, 3],
    [/\btoday\b/, 1],
  ],
};

const GOOD_WORDS: [RegExp, GoodId][] = [
  [/\b(medicine|medicines|medical|drug|drugs|pharma\w*)\b/, "medicine"],
  [/\b(food|rice|grain|grains|ration|rations)\b/, "food"],
  [/\b(lpg|gas|cylinder|cylinders)\b/, "lpg"],
  [/\b(fuel|petrol|diesel)\b/, "fuel"],
  [/\b(relief)\b/, "relief"],
];

export function parseQuery(raw: string): ParsedQuery {
  const text = normalize(raw);
  const places = findPlaces(raw);

  const scores: Record<IntentId, number> = {
    route: 0, district: 0, supply: 0, status: 0, isolation: 0, situation: 0, help: 0,
  };
  (Object.keys(RULES) as Exclude<IntentId, "help">[]).forEach((intent) => {
    for (const [pattern, weight] of RULES[intent]) {
      if (pattern.test(text)) scores[intent] += weight;
    }
  });

  const goods: GoodId[] = [];
  for (const [pattern, good] of GOOD_WORDS) {
    if (pattern.test(text) && !goods.includes(good)) goods.push(good);
  }

  const nonState = places.filter((p) => p.place.kind !== "state");
  const stateMatch = places.find((p) => p.place.kind === "state") ?? null;

  // Direction words decide origin and destination. Fall back to the order of mention.
  const tokens = text.split(" ");
  let origin: PlaceMatch | null = null;
  let destination: PlaceMatch | null = null;
  for (const m of nonState) {
    const before = tokens[m.start - 1] ?? "";
    const before2 = tokens[m.start - 2] ?? "";
    if (before === "from") origin = origin ?? m;
    else if (before === "to" || before === "towards" || before === "reach" || (before === "the" && before2 === "to")) {
      destination = destination ?? m;
    }
  }
  if (!origin && !destination && nonState.length >= 2) {
    origin = nonState[0];
    destination = nonState[1];
  } else if (!destination && nonState.length >= 2) {
    destination = nonState.find((m) => m !== origin) ?? null;
  } else if (!origin && nonState.length >= 2) {
    origin = nonState.find((m) => m !== destination) ?? null;
  }

  if (scores.route > 0 && (origin || destination) && scores.supply < 4) scores.route += 2;
  if (goods.length > 0 && scores.supply >= 4) scores.supply += 1;
  if (nonState.length >= 2 && scores.route === 0 && scores.supply < 4) scores.route += 3;
  if (scores.isolation > 0 && scores.district >= 3 && !/village/.test(text)) scores.isolation = 0;

  let intent: IntentId = "help";
  let best = 0;
  (Object.keys(RULES) as Exclude<IntentId, "help">[]).forEach((id) => {
    if (scores[id] > best) {
      best = scores[id];
      intent = id;
    }
  });
  if (best === 0 && places.length > 0) intent = "situation";
  scores.help = intent === "help" ? 1 : 0;

  let horizon: 0 | 24 | 48 | 72 = 0;
  if (/\b(72|three days|3 days)\b/.test(text)) horizon = 72;
  else if (/\b(48|two days|2 days|day after tomorrow)\b/.test(text)) horizon = 48;
  else if (/\b(24|tomorrow|next day|next 24)\b/.test(text)) horizon = 24;

  const countMatch = text.match(/\btop (\d{1,2})\b/);
  const count = countMatch ? Math.min(10, Math.max(1, Number(countMatch[1]))) : null;

  return {
    raw,
    text,
    intent,
    scores,
    places,
    origin,
    destination,
    goods,
    horizon,
    count,
    stateMatch,
    wantsSafest: !/\b(fastest|shortest|quickest)\b/.test(text),
  };
}
