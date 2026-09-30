export type LatLng = [number, number];
export type Bounds = [LatLng, LatLng];

export type ViewMode = "corridors" | "risk" | "isolation" | "supply" | "disaster" | "copilot";

export type CorridorStatus = "clear" | "caution" | "disrupted";

export interface Hub {
  id: string;
  name: string;
  state: string;
  pos: LatLng;
  major: boolean;
}

export interface Corridor {
  id: string;
  name: string;
  from: string;
  to: string;
  mode: "road" | "waterway";
  status: CorridorStatus;
  states: string[];
  hubIds: string[];
  path: LatLng[];
  advisory: string;
}

export interface Incident {
  id: string;
  corridorId: string;
  type: string;
  title: string;
  pos: LatLng;
}

export interface Layers {
  roads: boolean;
  waterways: boolean;
  hubs: boolean;
  incidents: boolean;
}
