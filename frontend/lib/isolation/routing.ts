import { EDGE_BY_ID, FACILITIES, edgesToSource, type Tree } from "./network";
import type { AltLink, Blockage, FacilityKind } from "./types";

export interface Option {
  nodeId: string;
  km: number;
  viaEdge: string | null;
}

export interface RoutingInput {
  roadId: string;
  at: number;
  spurKm: number;
  alt: AltLink | null;
}

// The ways a village can reach the road network. A blockage covers a stretch of one
// road: villages outside the stretch can still reach the nearer end, villages inside
// it cannot use that road at all.
export function optionsFor(v: RoutingInput, blockage: Blockage | null): Option[] {
  const edge = EDGE_BY_ID[v.roadId];
  const options: Option[] = [];
  const posKm = v.at * edge.lengthKm;

  if (blockage && blockage.edgeId === edge.id) {
    if (posKm <= blockage.startKm) {
      options.push({ nodeId: edge.from, km: v.spurKm + posKm, viaEdge: edge.id });
    } else if (posKm >= blockage.endKm) {
      options.push({ nodeId: edge.to, km: v.spurKm + (edge.lengthKm - posKm), viaEdge: edge.id });
    }
  } else {
    options.push({ nodeId: edge.from, km: v.spurKm + posKm, viaEdge: edge.id });
    options.push({ nodeId: edge.to, km: v.spurKm + (edge.lengthKm - posKm), viaEdge: edge.id });
  }

  if (v.alt) {
    options.push({ nodeId: v.alt.nodeId, km: v.alt.km, viaEdge: null });
  }
  return options;
}

export interface Best {
  km: number;
  facilityId: string;
  edgeIds: string[];
}

export function nearest(
  kind: FacilityKind,
  options: Option[],
  trees: Record<string, Tree>
): Best | null {
  let best: Best | null = null;
  for (const f of FACILITIES) {
    if (f.kind !== kind) continue;
    const tree = trees[f.id];
    for (const o of options) {
      const d = tree.dist.get(o.nodeId);
      if (d === undefined) continue;
      const km = o.km + d;
      if (best === null || km < best.km) {
        best = {
          km,
          facilityId: f.id,
          edgeIds: [...(o.viaEdge ? [o.viaEdge] : []), ...edgesToSource(tree, o.nodeId)],
        };
      }
    }
  }
  return best;
}
