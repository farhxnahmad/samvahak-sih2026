"use client";

import { motion } from "framer-motion";
import { X } from "lucide-react";
import StatusBadge from "../StatusBadge";
import InsightsPanel from "../risk/InsightsPanel";
import VillageStateBadge from "./VillageStateBadge";
import { corridors } from "@/lib/data";
import { fmt, plural } from "@/lib/format";
import { hubName } from "@/lib/isolation/simulate";
import { MEDICAL_STYLE, VILLAGE_STYLE } from "@/lib/isolation/style";
import type { RoadEdge, SimulationResult } from "@/lib/isolation/types";
import { VILLAGE_BY_ID, VILLAGES } from "@/lib/isolation/villages";
import { EASE } from "@/lib/motion";

interface IsolationPanelProps {
  edge: RoadEdge;
  dependentIds: ReadonlySet<string>;
  simulating: boolean;
  onSimulate: () => void;
  onStop: () => void;
  onClose: () => void;
  blockPct: number;
  blockLen: number;
  onBlockPct: (value: number) => void;
  onBlockLen: (value: number) => void;
  result: SimulationResult | null;
  recommendations: string[];
  focusVillageId: string | null;
  onFocusVillage: (id: string) => void;
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

export default function IsolationPanel({
  edge,
  dependentIds,
  simulating,
  onSimulate,
  onStop,
  onClose,
  blockPct,
  blockLen,
  onBlockPct,
  onBlockLen,
  result,
  recommendations,
  focusVillageId,
  onFocusVillage,
}: IsolationPanelProps) {
  const corridor = corridors.find((c) => c.id === edge.corridorId);
  const dependents = VILLAGES.filter((v) => dependentIds.has(v.id)).sort(
    (a, b) => b.population - a.population
  );
  const dependentPeople = dependents.reduce((sum, v) => sum + v.population, 0);

  const affected = result
    ? result.impacts
        .filter((i) => i.state === "isolated" || i.state === "at-risk")
        .sort((a, b) => {
          if (a.state !== b.state) return a.state === "isolated" ? -1 : 1;
          return VILLAGE_BY_ID[b.villageId].population - VILLAGE_BY_ID[a.villageId].population;
        })
    : [];

  const centerKm = Math.round(blockPct * edge.lengthKm);

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 14 }}
      transition={{ duration: 0.3, ease: EASE }}
      aria-label={`${edge.name} isolation analysis`}
      className="glass absolute inset-x-3 bottom-7 z-20 max-h-[62dvh] overflow-y-auto rounded-xl p-4 lg:inset-x-auto lg:bottom-4 lg:right-4 lg:top-[76px] lg:max-h-none lg:w-[380px]"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-forest-700">Selected road, {Math.round(edge.lengthKm)} km</p>
          <h2 className="mt-0.5 text-xl font-semibold leading-snug">{edge.name}</h2>
          {corridor && (
            <div className="mt-2 flex items-center gap-2 text-xs text-forest-700">
              <StatusBadge status={corridor.status} />
              <span>current corridor status</span>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close road analysis"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-forest-800 transition-colors hover:bg-forest-800/10"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      {!simulating && (
        <>
          <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-forest-800/10 pt-4">
            <div>
              <dt className="text-xs text-forest-700">Connected villages</dt>
              <dd className="mt-0.5 font-display text-3xl font-semibold tabular-nums">
                {dependents.length}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-forest-700">People served</dt>
              <dd className="mt-0.5 font-display text-3xl font-semibold tabular-nums">
                {fmt(dependentPeople)}
              </dd>
            </div>
          </dl>

          <h3 className="mt-5 text-sm font-semibold">Villages on this road</h3>
          <ul className="mt-2 space-y-1">
            {dependents.map((v) => (
              <li key={v.id}>
                <button
                  type="button"
                  onClick={() => onFocusVillage(v.id)}
                  aria-current={v.id === focusVillageId ? "true" : undefined}
                  className={`flex w-full items-start justify-between gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-forest-800/5 ${
                    v.id === focusVillageId ? "bg-forest-700/10" : ""
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{v.name}</span>
                    <span className="block truncate text-xs text-forest-700">
                      {v.district}, hospital {v.healthcareKm} km
                    </span>
                  </span>
                  <span className="shrink-0 text-sm tabular-nums">{fmt(v.population)}</span>
                </button>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={onSimulate}
            className="mt-5 h-11 w-full rounded-lg bg-forest-800 text-sm font-medium text-sand-50 transition-colors hover:bg-forest-700"
          >
            Simulate blockage
          </button>
        </>
      )}

      {simulating && result && (
        <>
          <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-4 border-t border-forest-800/10 pt-4">
            <div>
              <dt className="text-xs text-forest-700">Affected villages</dt>
              <dd className="mt-0.5 font-display text-4xl font-semibold tabular-nums">
                <AnimatedValue value={String(result.affectedCount)} />
              </dd>
            </div>
            <div>
              <dt className="text-xs text-forest-700">Population impacted</dt>
              <dd className="mt-0.5 font-display text-4xl font-semibold tabular-nums">
                <AnimatedValue value={fmt(result.populationImpacted)} />
              </dd>
            </div>
            <div className="col-span-2 flex items-center justify-between rounded-lg bg-forest-800/5 px-3 py-2.5">
              <dt className="text-sm text-forest-800">Medical access risk</dt>
              <dd
                className="rounded-md px-2.5 py-1 text-sm font-semibold"
                style={{
                  color: MEDICAL_STYLE[result.medicalRisk].ink,
                  backgroundColor: `${MEDICAL_STYLE[result.medicalRisk].color}2b`,
                }}
              >
                <AnimatedValue value={result.medicalRisk} />
              </dd>
            </div>
          </dl>

          <div className="mt-4 space-y-3 rounded-lg border border-forest-800/10 p-3">
            <h3 className="text-sm font-semibold">Blockage</h3>
            <label className="block text-sm">
              <span className="flex justify-between text-forest-800">
                <span>Position along the road</span>
                <span className="tabular-nums text-forest-700">km {centerKm}</span>
              </span>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(blockPct * 100)}
                onChange={(e) => onBlockPct(Number(e.target.value) / 100)}
                className="mt-1 w-full accent-forest-700"
              />
            </label>
            <label className="block text-sm">
              <span className="flex justify-between text-forest-800">
                <span>Blocked length</span>
                <span className="tabular-nums text-forest-700">{blockLen} km</span>
              </span>
              <input
                type="range"
                min={5}
                max={Math.floor(edge.lengthKm)}
                value={blockLen}
                onChange={(e) => onBlockLen(Number(e.target.value))}
                className="mt-1 w-full accent-forest-700"
              />
            </label>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-forest-700">You can also click the road on the map to move the blockage.</p>
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
            <InsightsPanel title="AI recommendation" items={recommendations} />
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            {(
              [
                { key: "isolated", count: result.isolatedCount, people: result.populationIsolated },
                { key: "at-risk", count: result.atRiskCount, people: result.populationAtRisk },
                { key: "connected", count: result.reroutedCount, people: null },
              ] as const
            ).map((row) => (
              <div key={row.key} className="rounded-lg bg-forest-800/5 px-2 py-2">
                <p className="text-xs" style={{ color: VILLAGE_STYLE[row.key].ink }}>
                  {row.key === "connected" ? "Rerouted" : VILLAGE_STYLE[row.key].label}
                </p>
                <p className="font-display text-xl font-semibold tabular-nums">{row.count}</p>
                <p className="text-[11px] text-forest-700">
                  {row.people === null ? "still connected" : `${fmt(row.people)} people`}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-lg border border-forest-800/10 p-3 text-sm">
            <h3 className="font-semibold">Route B</h3>
            {result.detour ? (
              <p className="mt-1 leading-relaxed text-forest-800">
                {result.detour.nodeIds.map(hubName).join(" to ")}, {result.detour.km} km, which is{" "}
                {result.detour.extraKm} km longer than the blocked road.
                {result.detour.km > 350 ? " Too long to be practical for freight." : ""}
              </p>
            ) : (
              <p className="mt-1 leading-relaxed text-forest-800">
                No other road links {hubName(edge.from)} and {hubName(edge.to)} in this network.
              </p>
            )}
          </div>

          <h3 className="mt-5 text-sm font-semibold">
            Affected {plural(affected.length, "village", "villages")}
          </h3>
          {affected.length === 0 ? (
            <p className="mt-2 text-sm text-forest-700">No village loses emergency access.</p>
          ) : (
            <ul className="mt-2 space-y-1">
              {affected.map((impact) => {
                const v = VILLAGE_BY_ID[impact.villageId];
                return (
                  <li key={impact.villageId}>
                    <button
                      type="button"
                      onClick={() => onFocusVillage(v.id)}
                      aria-current={v.id === focusVillageId ? "true" : undefined}
                      className={`w-full rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-forest-800/5 ${
                        v.id === focusVillageId ? "bg-forest-700/10" : ""
                      }`}
                    >
                      <span className="flex items-start justify-between gap-3">
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{v.name}</span>
                          <span className="block truncate text-xs text-forest-700">
                            {v.district}, {fmt(v.population)} people
                          </span>
                        </span>
                        <VillageStateBadge state={impact.state} />
                      </span>
                      <span className="mt-1 block text-xs leading-relaxed text-forest-800">
                        {impact.reason}
                      </span>
                      <span className="mt-0.5 block text-xs text-forest-700">
                        Emergency access:{" "}
                        {impact.emergency === "cut-off"
                          ? "cut off"
                          : impact.emergency === "delayed"
                            ? "delayed"
                            : "accessible"}
                        . Nearest alternative road: {impact.nearestAlternativeKm} km.
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </motion.section>
  );
}
