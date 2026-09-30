import type { LatLng } from "../types";
import type { FactorKey } from "./model";

// SAMPLE DATA. Replace this file with a feed from the Samvahak backend.
// Each row: id, name, state, latitude, longitude (district centre, approximate),
// then weather, incidents, congestion, history (each 0-100),
// then optional change over the last 24 hours in points per factor.

export type Shift = Partial<Record<FactorKey, number>>;

export interface DistrictInput {
  id: string;
  name: string;
  state: string;
  pos: LatLng;
  weather: number;
  incidents: number;
  congestion: number;
  history: number;
  shift: Shift;
}

type Row = [string, string, string, number, number, number, number, number, number, Shift?];

const ROWS: Row[] = [
  // Arunachal Pradesh
  ["tawang", "Tawang", "Arunachal Pradesh", 27.586, 91.859, 88, 78, 44, 62, { weather: 25, incidents: 17 }],
  ["west-kameng", "West Kameng", "Arunachal Pradesh", 27.264, 92.416, 78, 66, 45, 64, { weather: 18 }],
  ["east-kameng", "East Kameng", "Arunachal Pradesh", 27.36, 93.05, 66, 42, 30, 48],
  ["papum-pare", "Papum Pare", "Arunachal Pradesh", 27.13, 93.75, 62, 40, 55, 45],
  ["lower-subansiri", "Lower Subansiri", "Arunachal Pradesh", 27.55, 93.83, 60, 38, 28, 50],
  ["upper-subansiri", "Upper Subansiri", "Arunachal Pradesh", 27.99, 94.22, 55, 44, 25, 52],
  ["east-siang", "East Siang", "Arunachal Pradesh", 28.07, 95.33, 52, 36, 30, 42],
  ["lohit", "Lohit", "Arunachal Pradesh", 27.93, 96.16, 48, 34, 26, 44],
  ["changlang", "Changlang", "Arunachal Pradesh", 27.13, 95.74, 40, 30, 24, 38],
  ["tirap", "Tirap", "Arunachal Pradesh", 26.99, 95.56, 38, 28, 22, 36],
  ["dibang-valley", "Dibang Valley", "Arunachal Pradesh", 28.8, 95.9, 58, 46, 18, 54, { weather: 10 }],
  // Assam
  ["kamrup-metropolitan", "Kamrup Metropolitan", "Assam", 26.1445, 91.7362, 50, 52, 80, 40, { congestion: 12 }],
  ["dhubri", "Dhubri", "Assam", 26.02, 89.97, 58, 34, 36, 58, { weather: 12 }],
  ["goalpara", "Goalpara", "Assam", 26.17, 90.62, 50, 30, 32, 52],
  ["barpeta", "Barpeta", "Assam", 26.32, 91.0, 45, 28, 30, 50],
  ["kokrajhar", "Kokrajhar", "Assam", 26.4, 90.27, 48, 30, 32, 46],
  ["bongaigaon", "Bongaigaon", "Assam", 26.48, 90.56, 42, 28, 34, 44],
  ["nagaon", "Nagaon", "Assam", 26.35, 92.68, 44, 32, 42, 42],
  ["sonitpur", "Sonitpur", "Assam", 26.65, 92.79, 56, 36, 40, 48, { weather: 9 }],
  ["lakhimpur", "Lakhimpur", "Assam", 27.24, 94.1, 62, 34, 28, 56, { weather: 14 }],
  ["dibrugarh", "Dibrugarh", "Assam", 27.47, 94.91, 46, 32, 44, 40],
  ["tinsukia", "Tinsukia", "Assam", 27.49, 95.36, 50, 34, 36, 42, { weather: -7 }],
  ["sivasagar", "Sivasagar", "Assam", 26.99, 94.64, 40, 26, 32, 34],
  ["jorhat", "Jorhat", "Assam", 26.75, 94.2, 38, 26, 38, 32],
  ["golaghat", "Golaghat", "Assam", 26.52, 93.96, 36, 30, 30, 34],
  ["karbi-anglong", "Karbi Anglong", "Assam", 25.84, 93.43, 40, 42, 26, 56],
  ["dima-hasao", "Dima Hasao", "Assam", 25.17, 93.02, 95, 92, 34, 90, { incidents: 14 }],
  ["cachar", "Cachar", "Assam", 24.83, 92.78, 72, 58, 60, 60, { weather: 10, incidents: 8 }],
  ["hailakandi", "Hailakandi", "Assam", 24.68, 92.56, 55, 32, 34, 50, { weather: 8 }],
  ["sribhumi", "Sribhumi", "Assam", 24.87, 92.35, 58, 36, 40, 54],
  // Meghalaya
  ["east-khasi-hills", "East Khasi Hills", "Meghalaya", 25.58, 91.89, 84, 72, 74, 70, { weather: 14, congestion: 8 }],
  ["west-jaintia-hills", "West Jaintia Hills", "Meghalaya", 25.43, 92.2, 86, 80, 55, 76, { weather: 16, incidents: 10 }],
  ["ri-bhoi", "Ri Bhoi", "Meghalaya", 25.9, 91.88, 62, 44, 38, 52, { weather: 10 }],
  ["west-garo-hills", "West Garo Hills", "Meghalaya", 25.51, 90.2, 58, 38, 34, 48],
  ["east-garo-hills", "East Garo Hills", "Meghalaya", 25.49, 90.62, 54, 34, 26, 44],
  // Manipur
  ["imphal-west", "Imphal West", "Manipur", 24.82, 93.94, 34, 36, 62, 36, { congestion: 6 }],
  ["churachandpur", "Churachandpur", "Manipur", 24.33, 93.68, 42, 40, 26, 50],
  ["senapati", "Senapati", "Manipur", 25.27, 94.02, 50, 54, 28, 52, { incidents: 10 }],
  ["ukhrul", "Ukhrul", "Manipur", 25.12, 94.36, 40, 38, 22, 46],
  ["tamenglong", "Tamenglong", "Manipur", 24.99, 93.5, 44, 42, 20, 50],
  ["chandel", "Chandel", "Manipur", 24.32, 94.0, 36, 34, 22, 42],
  ["jiribam", "Jiribam", "Manipur", 24.8, 93.12, 70, 86, 34, 70, { incidents: -12 }],
  // Mizoram
  ["aizawl", "Aizawl", "Mizoram", 23.73, 92.72, 36, 34, 56, 44, { weather: -8 }],
  ["lunglei", "Lunglei", "Mizoram", 22.89, 92.73, 34, 30, 28, 40],
  ["champhai", "Champhai", "Mizoram", 23.47, 93.33, 28, 26, 22, 34],
  ["lawngtlai", "Lawngtlai", "Mizoram", 22.53, 92.89, 40, 30, 20, 38],
  // Nagaland
  ["kohima", "Kohima", "Nagaland", 25.67, 94.11, 46, 44, 56, 50],
  ["dimapur", "Dimapur", "Nagaland", 25.9, 93.73, 40, 36, 66, 40, { congestion: -8 }],
  ["mokokchung", "Mokokchung", "Nagaland", 26.32, 94.52, 38, 30, 28, 36],
  ["wokha", "Wokha", "Nagaland", 26.1, 94.26, 40, 32, 24, 38],
  ["tuensang", "Tuensang", "Nagaland", 26.27, 94.83, 30, 26, 20, 34],
  ["mon", "Mon", "Nagaland", 26.72, 95.03, 34, 28, 20, 34],
  // Sikkim
  ["east-sikkim", "East Sikkim", "Sikkim", 27.33, 88.61, 52, 60, 60, 66],
  ["north-sikkim", "North Sikkim", "Sikkim", 27.51, 88.53, 82, 74, 30, 80, { weather: 12 }],
  ["west-sikkim", "West Sikkim", "Sikkim", 27.29, 88.26, 58, 46, 28, 60],
  ["south-sikkim", "South Sikkim", "Sikkim", 27.17, 88.36, 50, 40, 30, 56],
  // Tripura
  ["west-tripura", "West Tripura", "Tripura", 23.83, 91.29, 30, 32, 52, 34, { weather: -9 }],
  ["north-tripura", "North Tripura", "Tripura", 24.37, 92.17, 34, 30, 28, 36],
  ["south-tripura", "South Tripura", "Tripura", 23.25, 91.45, 32, 28, 26, 34],
  ["dhalai", "Dhalai", "Tripura", 23.92, 91.85, 30, 30, 22, 36],
];

export const DISTRICT_INPUTS: DistrictInput[] = ROWS.map((row) => ({
  id: row[0],
  name: row[1],
  state: row[2],
  pos: [row[3], row[4]],
  weather: row[5],
  incidents: row[6],
  congestion: row[7],
  history: row[8],
  shift: row[9] ?? {},
}));

// Expected change to the weather factor (points) at +24h, +48h and +72h, by state.
export const STATE_OUTLOOK: Record<string, [number, number, number]> = {
  Meghalaya: [8, 14, 6],
  Assam: [4, 9, 7],
  "Arunachal Pradesh": [10, 12, 3],
  Sikkim: [6, 10, 8],
  Nagaland: [-2, 3, 2],
  Manipur: [-4, 0, 4],
  Mizoram: [0, -3, -5],
  Tripura: [-3, -6, -8],
};
