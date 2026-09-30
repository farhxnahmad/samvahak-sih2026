"use client";

import { motion } from "framer-motion";
import { X } from "lucide-react";
import InsightsPanel from "../risk/InsightsPanel";
import RiskBadge from "./RiskBadge";
import TimelineChart from "./TimelineChart";
import { GOOD_ICON } from "./goodIcons";
import { hubById } from "@/lib/data";
import { fmt, plural } from "@/lib/format";
import { DEPOT_BY_ID } from "@/lib/supply/depots";
import { GOODS, GOOD_BY_ID, type GoodId } from "@/lib/supply/goods";
import {
  LINES_BY_EDGE,
  TIMELINE_HOURS,
  type LineImpact,
  type SupplyAnalysis,
  type SupplyOption,
} from "@/lib/supply/model";
import type { RoadEdge } from "@/lib/isolation/types";
import { EASE } from "@/lib/motion";

interface SupplyPanelProps {
  edge: RoadEdge;
  simulating: boolean;
  onSimulate: () => void;
  onStop: () => void;
  onClose: () => void;
  closureHours: number;
  onClosureHours: (hours: number) => void;
  analysis: SupplyAnalysis | null;
  recommendations: string[];
  goodId: GoodId;
  onGood: (id: GoodId) => void;
  depotId: string | null;
  onDepot: (id: string) => void;
}

function AnimatedValue({ value }: { value: string }) {
  return (
    <motion.span
      key={value}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: EASE }}
      className="inline-block"
    >
      {value}
    </motion.span>
  );
}

function cellStyle(pct: number, safePct: number): { color: string; backgroundColor: string } {
  if (pct <= 0.05) return { color: "#9b2a1e", backgroundColor: "#c0392b33" };
  if (pct < safePct) return { color: "#9a4f0c", backgroundColor: "#e2842a33" };
  return { color: "#2b6b45", backgroundColor: "#3f8f5f22" };
}

function describe(option: SupplyOption): string {
  const names = option.nodeIds.map((id) => hubById[id]?.name ?? id);
  if (option.kind === "reroute") {
    return `Reroute from ${names[0]} hub via ${names.slice(1).join(", ")}. ${option.km} km, ${option.extraKm >= 0 ? "+" : ""}${option.extraKm} km against the normal route, about ${Math.round(option.leadHours)} hours to arrive, carries roughly ${Math.round(option.cap * 100)}% of normal volume.`;
  }
  return `Transfer from ${DEPOT_BY_ID[option.fromId].name}. ${option.km} km, about ${Math.round(option.leadHours)} hours to arrive, carries roughly ${Math.round(option.cap * 100)}% of normal volume.`;
}

export default function SupplyPanel({
  edge,
  simulating,
  onSimulate,
  onStop,
  onClose,
  closureHours,
  onClosureHours,
  analysis,
  recommendations,
  goodId,
  onGood,
  depotId,
  onDepot,
}: SupplyPanelProps) {
  const lines = LINES_BY_EDGE[edge.id] ?? [];
  const good = GOOD_BY_ID[goodId];

  const rows: LineImpact[] = analysis
    ? analysis.items
        .filter((i) => i.goodId === goodId && i.affected)
        .sort((a, b) => (a.hoursToThreshold ?? 999) - (b.hoursToThreshold ?? 999))
    : [];
  const active = rows.find((r) => r.depotId === depotId) ?? rows[0] ?? null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 14 }}
      transition={{ duration: 0.3, ease: EASE }}
      aria-label={`${edge.name} supply analysis`}
      className="glass absolute inset-x-3 bottom-7 z-20 max-h-[62dvh] overflow-y-auto rounded-xl p-4 lg:inset-x-auto lg:bottom-4 lg:right-4 lg:top-[76px] lg:max-h-none lg:w-[400px]"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-forest-700">Supply route, {Math.round(edge.lengthKm)} km</p>
          <h2 className="mt-0.5 text-xl font-semibold leading-snug">{edge.name}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close supply analysis"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-forest-800 transition-colors hover:bg-forest-800/10"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      {!simulating && (
        <>
          <h3 className="mt-4 border-t border-forest-800/10 pt-4 text-sm font-semibold">Goods carried on this road</h3>
          {lines.length === 0 ? (
            <p className="mt-2 text-sm text-forest-700">No depot depends on this road for essential goods.</p>
          ) : (
            <ul className="mt-2 space-y-1">
              {GOODS.map((g) => {
                const forGood = lines.filter((l) => l.goodId === g.id);
                if (forGood.length === 0) return null;
                const people = forGood.reduce((sum, l) => sum + DEPOT_BY_ID[l.depotId].people, 0);
                const Icon = GOOD_ICON[g.id];
                return (
                  <li key={g.id} className="flex items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-sm">
                    <span className="flex items-center gap-2">
                      <Icon size={16} style={{ color: g.color }} aria-hidden="true" />
                      <span className="font-medium">{g.label}</span>
                    </span>
                    <span className="text-xs text-forest-700">
                      {forGood.length} {plural(forGood.length, "depot", "depots")}, {fmt(people)} people
                    </span>
                  </li>
                );
              })}
            </ul>
          )}

          <label className="mt-5 block text-sm">
            <span className="flex justify-between text-forest-800">
              <span>Road closed for</span>
              <span className="tabular-nums text-forest-700">{closureHours} hours</span>
            </span>
            <input
              type="range"
              min={12}
              max={120}
              step={6}
              value={closureHours}
              onChange={(e) => onClosureHours(Number(e.target.value))}
              className="mt-1 w-full accent-forest-700"
            />
          </label>
          <button
            type="button"
            onClick={onSimulate}
            disabled={lines.length === 0}
            className="mt-4 h-11 w-full rounded-lg bg-forest-800 text-sm font-medium text-sand-50 transition-colors hover:bg-forest-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Simulate route failure
          </button>
        </>
      )}

      {simulating && analysis && (
        <>
          <section aria-label="Supply risk dashboard" className="mt-4 border-t border-forest-800/10 pt-4">
            <h3 className="text-sm font-semibold">Supply risk</h3>
            <ul className="mt-2 space-y-1">
              {GOODS.map((g) => {
                const summary = analysis.byGood[g.id];
                const Icon = GOOD_ICON[g.id];
                const selected = g.id === goodId;
                const earliest = summary.earliest;
                return (
                  <li key={g.id}>
                    <button
                      type="button"
                      onClick={() => onGood(g.id)}
                      aria-pressed={selected}
                      className={`flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left transition-colors ${
                        selected ? "bg-forest-700/10 ring-1 ring-forest-700/25" : "hover:bg-forest-800/5"
                      }`}
                    >
                      <span className="min-w-0">
                        <span className="flex items-center gap-2 text-sm font-medium">
                          <Icon size={16} style={{ color: g.color }} aria-hidden="true" />
                          {g.label}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-forest-700">
                          {summary.affectedDepots === 0
                            ? "No depot affected"
                            : earliest
                              ? `${DEPOT_BY_ID[earliest.depotId].name} below safe level in ${earliest.hours} h`
                              : `${summary.affectedDepots} ${plural(summary.affectedDepots, "depot", "depots")} delayed, stock holds`}
                        </span>
                      </span>
                      <RiskBadge risk={summary.risk} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-forest-800/5 px-2 py-2">
              <dt className="text-xs text-forest-700">Delayed shipments</dt>
              <dd className="font-display text-2xl font-semibold tabular-nums">
                <AnimatedValue value={fmt(analysis.delayedShipments)} />
              </dd>
            </div>
            <div className="rounded-lg bg-forest-800/5 px-2 py-2">
              <dt className="text-xs text-forest-700">Average delay</dt>
              <dd className="font-display text-2xl font-semibold tabular-nums">
                <AnimatedValue value={`${analysis.avgDelayHours} h`} />
              </dd>
            </div>
            <div className="rounded-lg bg-forest-800/5 px-2 py-2">
              <dt className="text-xs text-forest-700">Depots affected</dt>
              <dd className="font-display text-2xl font-semibold tabular-nums">
                <AnimatedValue value={String(analysis.affectedDepotIds.length)} />
              </dd>
            </div>
          </dl>

          <div className="mt-4 rounded-lg border border-forest-800/10 p-3">
            <label className="block text-sm">
              <span className="flex justify-between text-forest-800">
                <span>Road closed for</span>
                <span className="tabular-nums text-forest-700">{closureHours} hours</span>
              </span>
              <input
                type="range"
                min={12}
                max={120}
                step={6}
                value={closureHours}
                onChange={(e) => onClosureHours(Number(e.target.value))}
                className="mt-1 w-full accent-forest-700"
              />
            </label>
            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="text-xs text-forest-700">
                {fmt(analysis.people)} people are served by the affected depots.
              </p>
              <button
                type="button"
                onClick={onStop}
                className="shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium text-forest-800 transition-colors hover:bg-forest-800/10"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="mt-4">
            <InsightsPanel title="AI supply recommendation" items={recommendations} />
          </div>

          <section aria-label="Remaining stock timeline" className="mt-5">
            <h3 className="text-sm font-semibold">Remaining stock, {good.label.toLowerCase()}</h3>
            {rows.length === 0 ? (
              <p className="mt-2 text-sm text-forest-700">No depot for this good depends on the road.</p>
            ) : (
              <>
                <table className="mt-2 w-full border-separate border-spacing-y-1 text-sm">
                  <thead>
                    <tr className="text-xs text-forest-700">
                      <th scope="col" className="pb-1 text-left font-normal">Depot</th>
                      {TIMELINE_HOURS.map((h) => (
                        <th key={h} scope="col" className="pb-1 text-center font-normal">
                          {h} hours
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const selected = active !== null && row.depotId === active.depotId;
                      return (
                        <tr key={row.depotId}>
                          <th scope="row" className="text-left font-medium">
                            <button
                              type="button"
                              onClick={() => onDepot(row.depotId)}
                              aria-pressed={selected}
                              className={`w-full truncate rounded-md px-2 py-1.5 text-left text-sm ${
                                selected ? "bg-forest-700/10 ring-1 ring-forest-700/25" : "hover:bg-forest-800/5"
                              }`}
                            >
                              {DEPOT_BY_ID[row.depotId].name.replace(" depot", "")}
                            </button>
                          </th>
                          {TIMELINE_HOURS.map((h) => {
                            const pct = row.seriesPct[h];
                            return (
                              <td key={h} className="px-0.5 text-center">
                                <span
                                  className="block rounded-md py-1.5 text-xs font-semibold tabular-nums"
                                  style={cellStyle(pct, row.safePct)}
                                >
                                  {Math.round(pct)}%
                                </span>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <p className="text-xs text-forest-700">
                  Share of normal stock left. Orange is below the safe level of {good.safeDays} days of cover, red is empty.
                </p>

                {active && (
                  <div className="mt-4">
                    <p className="text-sm font-medium">
                      {DEPOT_BY_ID[active.depotId].name}
                      <span className="ml-2 text-xs font-normal text-forest-700">
                        {fmt(active.normalStock)} {good.unit} normally in stock, {fmt(active.dailyUse)} {good.unit} used per day
                      </span>
                    </p>
                    <TimelineChart impact={active} color={good.color} closureHours={closureHours} />
                    <p className="mt-1 text-xs text-forest-700">
                      {active.hoursToThreshold !== null
                        ? `Falls below the safe level in ${active.hoursToThreshold} hours.`
                        : "Stays above the safe level."}{" "}
                      {active.hoursToStockout !== null && active.hoursToStockout <= 168
                        ? `Runs out in ${active.hoursToStockout} hours.`
                        : ""}
                    </p>
                  </div>
                )}
              </>
            )}
          </section>

          {active && (
            <section aria-label="Alternative supply options" className="mt-5">
              <h3 className="text-sm font-semibold">Alternative supply options</h3>
              {active.options.length === 0 ? (
                <p className="mt-2 text-sm leading-relaxed text-forest-800">
                  No other road connects {DEPOT_BY_ID[active.depotId].name} to a source or a depot with spare stock. Air dispatch is the only option.
                </p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {active.options.map((option) => (
                    <li key={`${option.kind}-${option.fromId}`} className="rounded-lg border border-forest-800/10 p-3 text-sm leading-relaxed text-forest-800">
                      {describe(option)}
                      {active.chosen === option && (
                        <span className="ml-2 text-xs font-medium text-river-700">Used in the estimate</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </>
      )}
    </motion.section>
  );
}
