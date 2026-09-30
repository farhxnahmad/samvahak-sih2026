export interface HealthPayload {
  service: string;
  version: string;
  uptimeSeconds: number;
  database: "connected" | "connecting" | "disconnecting" | "disconnected" | "unknown";
}

export interface BackendState {
  _id: string;
  name: string;
  code?: string;
}

export interface ActiveIncidentsSummary {
  total: number;
  bySeverity?: Record<string, number>;
  byType?: Record<string, number>;
}

export interface AlertStatistics {
  days: number;
  total?: number;
  byLevel?: Record<string, number>;
}
