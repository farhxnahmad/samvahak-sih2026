export type GoodId = "medicine" | "food" | "lpg" | "fuel" | "relief";

export interface GoodInfo {
  id: GoodId;
  label: string;
  unit: string;
  // Daily use per 1,000 people served, in the unit above.
  perThousandPerDay: number;
  // Stock below this many days of cover is unsafe.
  safeDays: number;
  // Hubs that hold the main stock for this good and supply the depots.
  sources: string[];
  // Consignments a depot normally receives per day.
  shipmentsPerDay: number;
  color: string;
}

// SAMPLE PARAMETERS. Replace with the department's consumption norms and stock policy.
export const GOODS: GoodInfo[] = [
  { id: "medicine", label: "Medicines", unit: "kits", perThousandPerDay: 0.4, safeDays: 5, sources: ["guwahati", "siliguri"], shipmentsPerDay: 1, color: "#2b7fa8" },
  { id: "food", label: "Food", unit: "tonnes", perThousandPerDay: 0.4, safeDays: 7, sources: ["guwahati", "siliguri", "dimapur"], shipmentsPerDay: 4, color: "#5b8a3c" },
  { id: "lpg", label: "LPG", unit: "cylinders", perThousandPerDay: 6.5, safeDays: 3, sources: ["guwahati", "siliguri"], shipmentsPerDay: 3, color: "#d1861f" },
  { id: "fuel", label: "Fuel", unit: "kL", perThousandPerDay: 0.3, safeDays: 2, sources: ["guwahati", "siliguri"], shipmentsPerDay: 3, color: "#7a4a2a" },
  { id: "relief", label: "Relief supplies", unit: "packs", perThousandPerDay: 0.15, safeDays: 7, sources: ["guwahati", "silchar"], shipmentsPerDay: 1, color: "#8f7f5a" },
];

export const GOOD_BY_ID: Record<GoodId, GoodInfo> = {
  medicine: GOODS[0],
  food: GOODS[1],
  lpg: GOODS[2],
  fuel: GOODS[3],
  relief: GOODS[4],
};

export const GOOD_IDS: GoodId[] = GOODS.map((g) => g.id);
