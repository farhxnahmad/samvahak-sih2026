import { EDGES, FACILITIES, type Tree } from "../isolation/network";

interface Link {
  to: string;
  km: number;
  edgeId: string;
}

function runDijkstra(adj: Map<string, Link[]>, source: string): Tree {
  const dist = new Map<string, number>([[source, 0]]);
  const prev = new Map<string, { node: string; edgeId: string }>();
  const done = new Set<string>();
  for (;;) {
    let current = "";
    let best = Infinity;
    for (const [node, d] of dist) {
      if (!done.has(node) && d < best) {
        best = d;
        current = node;
      }
    }
    if (current === "") break;
    done.add(current);
    for (const link of adj.get(current) ?? []) {
      const nd = best + link.km;
      const known = dist.get(link.to);
      if (known === undefined || nd < known) {
        dist.set(link.to, nd);
        prev.set(link.to, { node: current, edgeId: link.edgeId });
      }
    }
  }
  return { dist, prev };
}

// Shortest paths from every facility, with some roads closed and others slowed.
export function treesWeighted(
  blocked: ReadonlySet<string>,
  multiplier: Record<string, number>
): Record<string, Tree> {
  const adj = new Map<string, Link[]>();
  const add = (a: string, b: string, km: number, edgeId: string) => {
    const list = adj.get(a) ?? [];
    list.push({ to: b, km, edgeId });
    adj.set(a, list);
  };
  for (const e of EDGES) {
    if (blocked.has(e.id)) continue;
    const km = e.lengthKm * (multiplier[e.id] ?? 1);
    add(e.from, e.to, km, e.id);
    add(e.to, e.from, km, e.id);
  }
  const trees: Record<string, Tree> = {};
  for (const f of FACILITIES) {
    trees[f.id] = runDijkstra(adj, f.nodeId);
  }
  return trees;
}
