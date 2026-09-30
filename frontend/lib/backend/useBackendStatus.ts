"use client";

import { useEffect, useState } from "react";
import { apiGet } from "./client";
import type { ActiveIncidentsSummary, AlertStatistics, BackendState, HealthPayload } from "./types";

export type BackendStatus = "checking" | "online" | "offline";

export interface BackendSnapshot {
  status: BackendStatus;
  health: HealthPayload | null;
  states: number | null;
  activeIncidents: number | null;
  alerts: number | null;
  error: string | null;
}

// Pings the real backend once on mount. This is the one place in the frontend that
// calls the live API; every simulation view still runs on its own sample data.
export function useBackendStatus(): BackendSnapshot {
  const [snapshot, setSnapshot] = useState<BackendSnapshot>({
    status: "checking",
    health: null,
    states: null,
    activeIncidents: null,
    alerts: null,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const health = await apiGet<HealthPayload>("/health");
        if (cancelled) return;

        const [states, incidents, alerts] = await Promise.allSettled([
          apiGet<{ states: BackendState[] }>("/states"),
          apiGet<ActiveIncidentsSummary>("/dashboard/active-incidents"),
          apiGet<AlertStatistics>("/dashboard/alert-statistics"),
        ]);
        if (cancelled) return;

        setSnapshot({
          status: "online",
          health,
          states: states.status === "fulfilled" ? states.value.states.length : null,
          activeIncidents: incidents.status === "fulfilled" ? incidents.value.total : null,
          alerts: alerts.status === "fulfilled" ? (alerts.value.total ?? null) : null,
          error: null,
        });
      } catch (err) {
        if (cancelled) return;
        setSnapshot({
          status: "offline",
          health: null,
          states: null,
          activeIncidents: null,
          alerts: null,
          error: err instanceof Error ? err.message : "Could not reach the backend.",
        });
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return snapshot;
}
