import type { Bounds, LatLng } from "../types";

export type IntentId = "route" | "district" | "supply" | "status" | "isolation" | "situation" | "help";
export type Level = "Low" | "Moderate" | "High" | "Critical";
export type FeedId = "weather" | "routes" | "incidents" | "risk";

export interface Confidence {
  value: number;
  label: "High" | "Medium" | "Low";
  basis: string[];
}

export interface RecommendationCard {
  id: string;
  category: string;
  priority: "Now" | "Today" | "Watch";
  action: string;
  outcome: string;
  confidence: Confidence;
}

export interface TransportOption {
  mode: string;
  suitability: "Best" | "Possible" | "Not advised";
  time: string;
  note: string;
}

export interface ContextItem {
  feed: FeedId;
  used: boolean;
  detail: string;
}

export interface MapPoint {
  pos: LatLng;
  label: string;
  kind: "origin" | "destination" | "district" | "depot" | "incident" | "village";
  color: string;
  permanent: boolean;
}

export interface MapRoute {
  path: LatLng[];
  kind: "safest" | "fastest" | "leg" | "highlight";
  label: string;
  color: string;
}

export interface MapHighlight {
  key: string;
  routes: MapRoute[];
  points: MapPoint[];
  bounds: Bounds | null;
}

export interface CopilotResponse {
  id: string;
  query: string;
  intent: IntentId;
  intentLabel: string;
  title: string;
  understood: { label: string; value: string }[];
  assessment: { level: Level; score: number | null; headline: string; points: string[] };
  cards: RecommendationCard[];
  alternatives: TransportOption[];
  context: ContextItem[];
  trace: string[];
  notes: string[];
  map: MapHighlight;
}
