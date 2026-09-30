import type { Bounds, CorridorStatus, LatLng } from "./types";

export const STATUS: Record<
  CorridorStatus,
  { label: string; color: string; ink: string }
> = {
  clear: { label: "Clear", color: "#2f7d52", ink: "#1f6b41" },
  caution: { label: "Caution", color: "#c98a1b", ink: "#8a5a0a" },
  disrupted: { label: "Disrupted", color: "#b0432f", ink: "#96331f" },
};

export const STATUS_KEYS: CorridorStatus[] = ["clear", "caution", "disrupted"];

export const WATERWAY_COLOR = "#2b7fa8";

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function pathLengthKm(path: LatLng[]): number {
  let total = 0;
  for (let i = 1; i < path.length; i += 1) {
    total += haversineKm(path[i - 1], path[i]);
  }
  return total;
}

export function boundsOf(path: LatLng[]): Bounds {
  const lats = path.map((p) => p[0]);
  const lngs = path.map((p) => p[1]);
  return [
    [Math.min(...lats), Math.min(...lngs)],
    [Math.max(...lats), Math.max(...lngs)],
  ];
}
