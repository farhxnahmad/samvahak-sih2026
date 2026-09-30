import { haversineKm } from "../geo";
import type { LatLng } from "../types";

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

function cumulative(path: LatLng[]): number[] {
  const cum: number[] = [0];
  for (let i = 1; i < path.length; i += 1) {
    cum.push(cum[i - 1] + haversineKm(path[i - 1], path[i]));
  }
  return cum;
}

export interface PointOnPath {
  pos: LatLng;
  a: LatLng;
  b: LatLng;
}

export function pointAt(path: LatLng[], fraction: number): PointOnPath {
  const cum = cumulative(path);
  const total = cum[cum.length - 1];
  const target = clamp01(fraction) * total;
  for (let i = 1; i < path.length; i += 1) {
    if (target <= cum[i] || i === path.length - 1) {
      const seg = cum[i] - cum[i - 1] || 1;
      const t = clamp01((target - cum[i - 1]) / seg);
      const a = path[i - 1];
      const b = path[i];
      return { pos: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], a, b };
    }
  }
  return { pos: path[0], a: path[0], b: path[path.length - 1] };
}

export function slicePath(path: LatLng[], f0: number, f1: number): LatLng[] {
  const cum = cumulative(path);
  const total = cum[cum.length - 1];
  const start = clamp01(f0) * total;
  const end = clamp01(f1) * total;
  const out: LatLng[] = [pointAt(path, f0).pos];
  for (let i = 1; i < path.length - 1; i += 1) {
    if (cum[i] > start && cum[i] < end) out.push(path[i]);
  }
  out.push(pointAt(path, f1).pos);
  return out;
}

interface SegmentHit {
  distKm: number;
  t: number;
}

function segmentHit(p: LatLng, a: LatLng, b: LatLng): SegmentHit {
  const kLat = 110.57;
  const kLng = 111.32 * Math.cos((p[0] * Math.PI) / 180);
  const ax = (a[1] - p[1]) * kLng;
  const ay = (a[0] - p[0]) * kLat;
  const bx = (b[1] - p[1]) * kLng;
  const by = (b[0] - p[0]) * kLat;
  const dx = bx - ax;
  const dy = by - ay;
  const l2 = dx * dx + dy * dy;
  const t = l2 === 0 ? 0 : clamp01(-(ax * dx + ay * dy) / l2);
  return { distKm: Math.hypot(ax + t * dx, ay + t * dy), t };
}

export function distanceToPathKm(p: LatLng, path: LatLng[]): number {
  let best = Infinity;
  for (let i = 1; i < path.length; i += 1) {
    best = Math.min(best, segmentHit(p, path[i - 1], path[i]).distKm);
  }
  return best;
}

// Fraction (0 to 1) along the path of the point closest to p.
export function fractionAlong(p: LatLng, path: LatLng[]): number {
  const cum = cumulative(path);
  const total = cum[cum.length - 1] || 1;
  let bestDist = Infinity;
  let bestKm = 0;
  for (let i = 1; i < path.length; i += 1) {
    const hit = segmentHit(p, path[i - 1], path[i]);
    if (hit.distKm < bestDist) {
      bestDist = hit.distKm;
      bestKm = cum[i - 1] + hit.t * (cum[i] - cum[i - 1]);
    }
  }
  return clamp01(bestKm / total);
}

export interface NearestOnPath {
  pos: LatLng;
  distKm: number;
  fraction: number;
}

// The point on the path closest to p, its distance and its fraction along the path.
export function nearestOnPath(p: LatLng, path: LatLng[]): NearestOnPath {
  const cum = cumulative(path);
  const total = cum[cum.length - 1] || 1;
  let best: NearestOnPath = { pos: path[0], distKm: Infinity, fraction: 0 };
  for (let i = 1; i < path.length; i += 1) {
    const a = path[i - 1];
    const b = path[i];
    const hit = segmentHit(p, a, b);
    if (hit.distKm < best.distKm) {
      best = {
        pos: [a[0] + (b[0] - a[0]) * hit.t, a[1] + (b[1] - a[1]) * hit.t],
        distKm: hit.distKm,
        fraction: clamp01((cum[i - 1] + hit.t * (cum[i] - cum[i - 1])) / total),
      };
    }
  }
  return best;
}
