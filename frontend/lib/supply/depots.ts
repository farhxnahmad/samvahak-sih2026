import { hubById } from "../data";
import type { LatLng } from "../types";
import type { GoodId } from "./goods";

export interface Depot {
  id: string;
  name: string;
  people: number;
  pos: LatLng;
  // Days of cover held in normal times, per good.
  cover: Record<GoodId, number>;
}

// SAMPLE DATA. People served and stock cover are placeholders.
// Row: hub id, people served, cover days for medicine, food, lpg, fuel, relief.
type Row = [string, number, number, number, number, number, number];

const ROWS: Row[] = [
  ["guwahati", 1800000, 14, 20, 7, 6, 25],
  ["siliguri", 900000, 12, 15, 6, 5, 20],
  ["shillong", 420000, 9, 14, 5, 4, 16],
  ["tura", 180000, 6.5, 9, 3.5, 2.5, 10],
  ["silchar", 350000, 9, 13, 5, 4, 18],
  ["imphal", 520000, 8, 11, 4.5, 3.5, 14],
  ["kohima", 260000, 7.5, 10, 4, 3, 12],
  ["dimapur", 300000, 8.5, 16, 5, 4, 14],
  ["aizawl", 340000, 7, 10, 4, 3, 12],
  ["agartala", 480000, 8, 12, 5, 3.5, 15],
  ["itanagar", 260000, 7, 10, 4, 3, 11],
  ["tezpur", 200000, 8, 12, 4.5, 3.5, 12],
  ["jorhat", 230000, 8.5, 13, 5, 4, 13],
  ["dibrugarh", 280000, 9, 14, 5, 4, 14],
  ["gangtok", 200000, 6.5, 9, 3.5, 2.5, 10],
];

export const DEPOTS: Depot[] = ROWS.map((r) => ({
  id: r[0],
  name: `${hubById[r[0]].name} depot`,
  people: r[1],
  pos: hubById[r[0]].pos,
  cover: { medicine: r[2], food: r[3], lpg: r[4], fuel: r[5], relief: r[6] },
}));

export const DEPOT_BY_ID: Record<string, Depot> = Object.fromEntries(
  DEPOTS.map((d): [string, Depot] => [d.id, d])
);
