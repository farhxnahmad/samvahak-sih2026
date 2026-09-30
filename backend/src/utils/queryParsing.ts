/** Shared helpers for reading typed values out of req.query (all strings by default). */

export const asQueryString = (v: unknown): string | undefined => (typeof v === "string" && v ? v : undefined);

export function parseIntInRange(v: unknown, fallback: number, min: number, max: number): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}
