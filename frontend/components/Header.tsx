"use client";

import { motion } from "framer-motion";
import { Route, Gauge, Unlink, Boxes, ShieldAlert, Radar, type LucideIcon } from "lucide-react";
import { fmt } from "@/lib/format";
import { STATUS, STATUS_KEYS } from "@/lib/geo";
import { EASE } from "@/lib/motion";
import { CATEGORY, CATEGORY_KEYS, type RiskCategory } from "@/lib/risk/model";
import BackendBadge from "./backend/BackendBadge";
import AuthStatus from "./auth/AuthStatus";
import type { AuthState } from "@/lib/auth/useAuth";
import type { Horizon } from "@/lib/risk/engine";
import type { SupplyRisk } from "@/lib/supply/model";
import { SUPPLY_RISK_STYLE } from "@/lib/supply/style";
import type { CorridorStatus, ViewMode } from "@/lib/types";

function Logo() {
  return (
    <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="7" fill="#17392a" />
      <path
        d="M6 23 L13 12 L18 18 L21 14 L26 23"
        fill="none"
        stroke="#f8f4ea"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="23" cy="8.5" r="2.2" fill="#4f9dc2" />
    </svg>
  );
}

const VIEWS: { id: ViewMode; label: string; Icon: LucideIcon }[] = [
  { id: "corridors", label: "Corridors", Icon: Route },
  { id: "risk", label: "Risk", Icon: Gauge },
  { id: "isolation", label: "Isolation", Icon: Unlink },
  { id: "supply", label: "Supply", Icon: Boxes },
  { id: "disaster", label: "Disaster", Icon: ShieldAlert },
  { id: "copilot", label: "Co-Pilot", Icon: Radar },
];

export interface CopilotSummary {
  queries: number;
  level: string | null;
}

export interface DisasterSummary {
  active: boolean;
  hour: number;
  blocked: number;
  degraded: number;
  villages: number;
}

export interface SupplySummary {
  depots: number;
  routes: number;
  overall: SupplyRisk | null;
}

export interface IsolationSummary {
  villages: number;
  people: number;
  affected: number | null;
}

interface HeaderProps {
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
  corridorCounts: Record<CorridorStatus, number>;
  incidentCount: number;
  riskCounts: Record<RiskCategory, number>;
  horizon: Horizon;
  isolationSummary: IsolationSummary;
  supplySummary: SupplySummary;
  disasterSummary: DisasterSummary;
  copilotSummary: CopilotSummary;
  auth: AuthState;
}

export default function Header({
  view,
  onViewChange,
  corridorCounts,
  incidentCount,
  riskCounts,
  horizon,
  isolationSummary,
  supplySummary,
  disasterSummary,
  copilotSummary,
  auth,
}: HeaderProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15, ease: EASE }}
      className="glass absolute inset-x-3 top-3 z-30 flex h-14 items-center justify-between gap-3 rounded-xl px-3 sm:px-4 lg:inset-x-4"
    >
      <div className="flex items-center gap-3">
        <Logo />
        <div className="hidden leading-tight min-[420px]:block">
          <p className="font-display text-lg font-semibold tracking-tight">Samvahak</p>
          <p className="hidden text-xs text-forest-700 sm:block">North East Region</p>
        </div>
      </div>

      <div
        role="group"
        aria-label="Dashboard view"
        className="flex gap-1 rounded-lg bg-forest-800/10 p-1"
      >
        {VIEWS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            aria-pressed={view === id}
            aria-label={label}
            onClick={() => onViewChange(id)}
            className={`flex h-8 items-center gap-2 rounded-md px-2.5 text-sm font-medium transition-colors sm:px-3 ${
              view === id
                ? "bg-sand-50 text-forest-900 shadow-sm"
                : "text-forest-700 hover:text-forest-900"
            }`}
          >
            <Icon size={15} aria-hidden="true" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      <ul
        className="hidden items-center gap-5 text-sm text-forest-800 xl:flex"
        aria-label={
          view === "corridors"
            ? "Corridor status summary"
            : view === "risk"
              ? "District risk summary"
              : view === "isolation"
                ? "Village database summary"
                : view === "supply"
                  ? "Essential goods summary"
                  : view === "disaster"
                    ? "Incident summary"
                    : "Co-pilot summary"
        }
      >
        {view === "corridors" ? (
          <>
            {STATUS_KEYS.map((key) => (
              <li key={key} className="flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: STATUS[key].color }}
                  aria-hidden="true"
                />
                <span className="font-medium tabular-nums">{corridorCounts[key]}</span>
                <span className="text-forest-700">{STATUS[key].label.toLowerCase()}</span>
              </li>
            ))}
            <li className="flex items-center gap-2 border-l border-forest-800/15 pl-5">
              <span className="font-medium tabular-nums">{incidentCount}</span>
              <span className="text-forest-700">open incidents</span>
            </li>
          </>
        ) : view === "copilot" ? (
          <>
            <li className="flex items-center gap-2">
              <span className="font-medium tabular-nums">4</span>
              <span className="text-forest-700">data feeds</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="font-medium tabular-nums">{copilotSummary.queries}</span>
              <span className="text-forest-700">queries this session</span>
            </li>
            {copilotSummary.level !== null && (
              <li className="flex items-center gap-2 border-l border-forest-800/15 pl-5">
                <span className="font-medium">{copilotSummary.level}</span>
                <span className="text-forest-700">latest assessment</span>
              </li>
            )}
          </>
        ) : view === "disaster" ? (
          disasterSummary.active ? (
            <>
              <li className="flex items-center gap-2">
                <span className="font-medium tabular-nums">T+{disasterSummary.hour}h</span>
                <span className="text-forest-700">incident clock</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="font-medium tabular-nums">{disasterSummary.blocked}</span>
                <span className="text-forest-700">roads blocked</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="font-medium tabular-nums">{disasterSummary.degraded}</span>
                <span className="text-forest-700">degraded</span>
              </li>
              <li className="flex items-center gap-2 border-l border-forest-800/15 pl-5">
                <span className="font-medium tabular-nums">{disasterSummary.villages}</span>
                <span className="text-forest-700">villages affected</span>
              </li>
            </>
          ) : (
            <li className="text-forest-700">No active simulation</li>
          )
        ) : view === "supply" ? (
          <>
            <li className="flex items-center gap-2">
              <span className="font-medium tabular-nums">{supplySummary.depots}</span>
              <span className="text-forest-700">depots</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="font-medium tabular-nums">{supplySummary.routes}</span>
              <span className="text-forest-700">supply lines</span>
            </li>
            {supplySummary.overall !== null && (
              <li className="flex items-center gap-2 border-l border-forest-800/15 pl-5">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: SUPPLY_RISK_STYLE[supplySummary.overall].color }}
                  aria-hidden="true"
                />
                <span className="font-medium">{supplySummary.overall}</span>
                <span className="text-forest-700">worst supply risk</span>
              </li>
            )}
          </>
        ) : view === "isolation" ? (
          <>
            <li className="flex items-center gap-2">
              <span className="font-medium tabular-nums">{isolationSummary.villages}</span>
              <span className="text-forest-700">villages</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="font-medium tabular-nums">{fmt(isolationSummary.people)}</span>
              <span className="text-forest-700">people</span>
            </li>
            {isolationSummary.affected !== null && (
              <li className="flex items-center gap-2 border-l border-forest-800/15 pl-5">
                <span className="font-medium tabular-nums">{isolationSummary.affected}</span>
                <span className="text-forest-700">affected by the blockage</span>
              </li>
            )}
          </>
        ) : (
          <>
            {CATEGORY_KEYS.map((key) => (
              <li key={key} className="flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: CATEGORY[key].color }}
                  aria-hidden="true"
                />
                <span className="font-medium tabular-nums">{riskCounts[key]}</span>
                <span className="text-forest-700">{CATEGORY[key].label.toLowerCase()}</span>
              </li>
            ))}
            <li className="border-l border-forest-800/15 pl-5 text-forest-700">
              {horizon === 0 ? "Now" : `In ${horizon} hours`}
            </li>
          </>
        )}
      </ul>

      <div className="flex items-center gap-2">
        <AuthStatus auth={auth} />
        <BackendBadge />
        <p
          className="hidden rounded-md border border-sand-300 bg-sand-100/70 px-2 py-1 text-xs text-forest-800 sm:block"
          title="The map views use sample data built into the frontend, separate from the backend badge."
        >
          Sample data
        </p>
      </div>
    </motion.header>
  );
}
