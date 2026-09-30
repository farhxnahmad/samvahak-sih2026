import { hubById } from "../data";
import type { LatLng } from "../types";
import { pointAt } from "./geometry";
import { EDGES, EDGE_BY_ID, treesFor } from "./network";
import { nearest, optionsFor, type Best } from "./routing";
import { VILLAGE_SEEDS } from "./seeds";
import type { Village } from "./types";

function slug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function hash(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i += 1) {
    h = (h * 31 + text.charCodeAt(i)) % 100003;
  }
  return h;
}

// Places the village beside its road. The sideways offset is exaggerated so the
// markers do not sit on top of the road line, so positions are schematic.
function positionOf(roadId: string, at: number, spurKm: number, id: string): LatLng {
  const { pos, a, b } = pointAt(EDGE_BY_ID[roadId].path, at);
  const cosLat = Math.cos((pos[0] * Math.PI) / 180);
  const east = (b[1] - a[1]) * cosLat;
  const north = b[0] - a[0];
  const len = Math.hypot(east, north) || 1;
  const sign = hash(id) % 2 === 0 ? 1 : -1;
  const magnitude = (0.02 + spurKm * 0.012) * sign;
  return [pos[0] + (east / len) * magnitude, pos[1] + (-north / len) * magnitude / cosLat];
}

export interface BaselineRoutes {
  health: Best;
  supply: Best;
}

const noRoute: Best = { km: 0, facilityId: "", edgeIds: [] };

const baselineTrees = treesFor(new Set<string>());

const built: { village: Village; routes: BaselineRoutes }[] = VILLAGE_SEEDS.map((row) => {
  const [name, district, state, population, roadId, at, spurKm, altRow] = row;
  const id = slug(`${name}-${district}`);
  const edge = EDGE_BY_ID[roadId];
  const alt = altRow
    ? { nodeId: altRow[0], km: altRow[1], name: `Link road to ${hubById[altRow[0]].name}` }
    : null;

  const options = optionsFor({ roadId, at, spurKm, alt }, null);
  const health = nearest("healthcare", options, baselineTrees) ?? noRoute;
  const supply = nearest("supply", options, baselineTrees) ?? noRoute;

  const village: Village = {
    id,
    name,
    district,
    state,
    population,
    roadId,
    at,
    spurKm,
    alt,
    pos: positionOf(roadId, at, spurKm, id),
    connectedRoads: [
      { id: edge.id, name: edge.name },
      ...(alt ? [{ id: `link:${id}`, name: alt.name }] : []),
    ],
    healthcareId: health.facilityId,
    healthcareKm: Math.round(health.km * 10) / 10,
    supplyId: supply.facilityId,
    supplyKm: Math.round(supply.km * 10) / 10,
  };
  return { village, routes: { health, supply } };
});

export const VILLAGES: Village[] = built.map((b) => b.village);
export const VILLAGE_BY_ID: Record<string, Village> = Object.fromEntries(
  VILLAGES.map((v): [string, Village] => [v.id, v])
);
export const BASELINE: Record<string, BaselineRoutes> = Object.fromEntries(
  built.map((b): [string, BaselineRoutes] => [b.village.id, b.routes])
);

// For each road, the villages whose normal route to a hospital or supply depot uses it.
export const DEPENDENTS: Record<string, Set<string>> = {};
EDGES.forEach((e) => {
  DEPENDENTS[e.id] = new Set<string>();
});
built.forEach(({ village, routes }) => {
  const used = new Set<string>([village.roadId, ...routes.health.edgeIds, ...routes.supply.edgeIds]);
  used.forEach((edgeId) => {
    DEPENDENTS[edgeId]?.add(village.id);
  });
});

export function populationOf(ids: Iterable<string>): number {
  let total = 0;
  for (const id of ids) {
    total += VILLAGE_BY_ID[id]?.population ?? 0;
  }
  return total;
}
