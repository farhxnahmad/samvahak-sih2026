import { hubs } from "../data";
import { haversineKm } from "../geo";
import { EDGES } from "../isolation/network";
import { DISTRICT_INPUTS } from "../risk/districts";
import type { LatLng } from "../types";

export type PlaceKind = "hub" | "district" | "state";

export interface Place {
  id: string;
  name: string;
  kind: PlaceKind;
  pos: LatLng;
  state: string;
  // The road network node this place connects to, and the straight-line distance to it.
  hubId: string;
  hubKm: number;
}

export interface PlaceMatch {
  place: Place;
  start: number;
  end: number;
  fuzzy: boolean;
  text: string;
}

const NODE_IDS = new Set(EDGES.flatMap((e) => [e.from, e.to]));
const NETWORK_HUBS = hubs.filter((h) => NODE_IDS.has(h.id));

function nearestHub(pos: LatLng): { id: string; km: number } {
  let best = { id: NETWORK_HUBS[0].id, km: Infinity };
  for (const h of NETWORK_HUBS) {
    const km = haversineKm(pos, h.pos);
    if (km < best.km) best = { id: h.id, km };
  }
  return best;
}

export function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
}

const byKey = new Map<string, Place>();
const places: Place[] = [];

function register(key: string, place: Place): void {
  const k = normalize(key);
  if (k && !byKey.has(k)) byKey.set(k, place);
}

// Hubs first, so a name shared by a hub and a district resolves to the hub.
for (const h of hubs) {
  const near = nearestHub(h.pos);
  const place: Place = {
    id: `hub:${h.id}`,
    name: h.name,
    kind: "hub",
    pos: h.pos,
    state: h.state,
    hubId: NODE_IDS.has(h.id) ? h.id : near.id,
    hubKm: NODE_IDS.has(h.id) ? 0 : near.km,
  };
  places.push(place);
  register(h.name, place);
}
register("gauhati", byKey.get("guwahati") as Place);

for (const d of DISTRICT_INPUTS) {
  const near = nearestHub(d.pos);
  const place: Place = {
    id: `district:${d.id}`,
    name: d.name,
    kind: "district",
    pos: d.pos,
    state: d.state,
    hubId: near.id,
    hubKm: near.km,
  };
  places.push(place);
  register(d.name, place);
}
register("kamrup", byKey.get("kamrup metropolitan") as Place);

const states = Array.from(new Set(DISTRICT_INPUTS.map((d) => d.state)));
for (const state of states) {
  const members = DISTRICT_INPUTS.filter((d) => d.state === state);
  const lat = members.reduce((s, d) => s + d.pos[0], 0) / members.length;
  const lng = members.reduce((s, d) => s + d.pos[1], 0) / members.length;
  const near = nearestHub([lat, lng]);
  const place: Place = {
    id: `state:${state}`,
    name: state,
    kind: "state",
    pos: [lat, lng],
    state,
    hubId: near.id,
    hubKm: near.km,
  };
  places.push(place);
  register(state, place);
}
register("arunachal", byKey.get("arunachal pradesh") as Place);

export const STATE_NAMES = states;

const STOP = new Set([
  "route", "routes", "safest", "fastest", "shortest", "which", "district", "districts", "supply", "supplies",
  "medicine", "medicines", "medical", "vulnerable", "today", "tomorrow", "status", "weather", "incident",
  "incidents", "reports", "villages", "between", "travel", "reach", "hours", "should", "please", "cylinders",
  "shortage", "assam", "relief", "fuel", "food", "risks", "risk", "north", "east", "region", "current",
]);

function distance(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return dp[a.length][b.length];
}

const SINGLE_WORD_KEYS = Array.from(byKey.keys()).filter((k) => !k.includes(" ") && k.length >= 6);

// Finds place names in a query, longest names first, with light spelling tolerance.
export function findPlaces(query: string): PlaceMatch[] {
  const tokens = normalize(query).split(" ").filter(Boolean);
  const used = new Array<boolean>(tokens.length).fill(false);
  const matches: PlaceMatch[] = [];

  for (let n = 4; n >= 1; n -= 1) {
    for (let i = 0; i + n <= tokens.length; i += 1) {
      if (used.slice(i, i + n).some(Boolean)) continue;
      const phrase = tokens.slice(i, i + n).join(" ");
      const place = byKey.get(phrase);
      if (place) {
        matches.push({ place, start: i, end: i + n, fuzzy: false, text: phrase });
        for (let k = i; k < i + n; k += 1) used[k] = true;
      }
    }
  }

  tokens.forEach((token, i) => {
    if (used[i] || token.length < 6 || STOP.has(token)) return;
    const limit = token.length >= 9 ? 2 : 1;
    let best: { key: string; d: number } | null = null;
    for (const key of SINGLE_WORD_KEYS) {
      if (Math.abs(key.length - token.length) > limit) continue;
      const d = distance(token, key);
      if (d <= limit && (best === null || d < best.d)) best = { key, d };
    }
    const place = best ? byKey.get(best.key) : undefined;
    if (place) {
      matches.push({ place, start: i, end: i + 1, fuzzy: true, text: token });
      used[i] = true;
    }
  });

  return matches.sort((a, b) => a.start - b.start);
}

export function getPlace(name: string): Place | undefined {
  return byKey.get(normalize(name));
}

export function placeForHub(hubId: string): Place | undefined {
  return places.find((p) => p.kind === "hub" && p.id === `hub:${hubId}`);
}
