"use client";

import { useBackendStatus } from "@/lib/backend/useBackendStatus";
import { BACKEND_BASE_URL } from "@/lib/backend/client";

// Shows whether the real samvahak-backend (Express + MongoDB) is reachable.
// This is the only live-data indicator in the app; the map views below all run on
// their own built-in sample data regardless of what this badge shows.
export default function BackendBadge() {
  const snap = useBackendStatus();

  const label =
    snap.status === "checking" ? "Checking backend..." : snap.status === "online" ? "Backend live" : "Backend offline";
  const dot = snap.status === "online" ? "#2f9d6a" : snap.status === "offline" ? "#b0432f" : "#a89670";

  const title =
    snap.status === "online"
      ? `Connected to ${BACKEND_BASE_URL}. Database ${snap.health?.database}.${
          snap.states !== null ? ` ${snap.states} states,` : ""
        }${snap.activeIncidents !== null ? ` ${snap.activeIncidents} active incidents,` : ""}${
          snap.alerts !== null ? ` ${snap.alerts} alerts.` : ""
        }`
      : snap.status === "offline"
        ? `Could not reach ${BACKEND_BASE_URL}. ${snap.error ?? ""} Start the backend (npm run dev in /backend) to connect.`
        : `Contacting ${BACKEND_BASE_URL}...`;

  return (
    <p
      className="hidden items-center gap-1.5 rounded-md border border-sand-300 bg-sand-100/70 px-2 py-1 text-xs text-forest-800 sm:flex"
      title={title}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: dot }} aria-hidden="true" />
      {label}
    </p>
  );
}
