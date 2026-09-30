"use client";

import { motion } from "framer-motion";
import { Play, RotateCcw } from "lucide-react";
import { TYPE_ICON } from "./icons";
import { DISTRICT_OPTIONS, STATE_OPTIONS } from "@/lib/disaster/useScenario";
import { SEVERITY_LABEL, TYPE_INFO, TYPE_ORDER } from "@/lib/disaster/meta";
import { SEVERITIES } from "@/lib/disaster/engine";
import type { ScenarioConfig } from "@/lib/disaster/types";
import { EASE } from "@/lib/motion";

interface ControlsPanelProps {
  config: ScenarioConfig;
  onConfig: (patch: Partial<ScenarioConfig>) => void;
  onRun: () => void;
  onReset: () => void;
  running: boolean;
}

const selectClass =
  "mt-1 h-10 w-full rounded-lg border border-white/15 bg-white/10 px-3 text-sm text-sand-50 [&>option]:text-forest-900";

export default function ControlsPanel({ config, onConfig, onRun, onReset, running }: ControlsPanelProps) {
  const districts = DISTRICT_OPTIONS.filter((d) => d.state === config.state);
  const info = TYPE_INFO[config.type];

  return (
    <motion.aside
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.3, ease: EASE }}
      aria-label="Scenario controls"
      className={`glass-dark absolute inset-x-3 bottom-7 z-20 max-h-[62dvh] flex-col overflow-y-auto rounded-xl p-4 lg:inset-x-auto lg:bottom-4 lg:left-4 lg:top-[76px] lg:max-h-none lg:w-[330px] ${
        running ? "hidden lg:flex" : "flex"
      }`}
    >
      <p className="text-[11px] font-medium uppercase tracking-wider text-sand-300">Scenario</p>
      <h2 className="mt-0.5 text-xl font-semibold">Disaster simulation</h2>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <label className="block text-sm">
          <span className="text-sand-300">State</span>
          <select
            value={config.state}
            onChange={(e) => onConfig({ state: e.target.value })}
            className={selectClass}
          >
            {STATE_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-sand-300">District</span>
          <select
            value={config.districtId}
            onChange={(e) => onConfig({ districtId: e.target.value })}
            className={selectClass}
          >
            {districts.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <fieldset className="mt-4">
        <legend className="text-sm text-sand-300">Disaster type</legend>
        <div className="mt-1 grid grid-cols-2 gap-2">
          {TYPE_ORDER.map((type) => {
            const Icon = TYPE_ICON[type];
            const active = config.type === type;
            return (
              <button
                key={type}
                type="button"
                aria-pressed={active}
                onClick={() => onConfig({ type })}
                className={`flex h-10 items-center gap-2 rounded-lg border px-3 text-left text-sm transition-colors ${
                  active
                    ? "border-sand-50 bg-sand-50 text-forest-900"
                    : "border-white/15 bg-white/5 text-sand-50 hover:bg-white/10"
                }`}
              >
                <Icon size={16} aria-hidden="true" />
                {TYPE_INFO[type].label}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs leading-relaxed text-sand-300">{info.blurb}</p>
      </fieldset>

      <fieldset className="mt-4">
        <legend className="text-sm text-sand-300">Severity</legend>
        <div className="mt-1 grid grid-cols-4 gap-1 rounded-lg bg-white/10 p-1">
          {SEVERITIES.map((sev) => {
            const active = config.severity === sev;
            return (
              <button
                key={sev}
                type="button"
                aria-pressed={active}
                onClick={() => onConfig({ severity: sev })}
                className={`rounded-md px-1 py-2 text-xs font-medium transition-colors ${
                  active ? "bg-sand-50 text-forest-900" : "text-sand-100 hover:bg-white/10"
                }`}
              >
                <span className="block text-sm tabular-nums">{sev}</span>
                {SEVERITY_LABEL[sev]}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-sand-300">
          The hazard zone reaches about {info.radiusKm[config.severity - 1]} km by 48 hours.
          {info.snapsToRoad ? " It is placed on the nearest modelled road." : " It is centred on the district."}
        </p>
      </fieldset>

      <div className="mt-auto flex gap-2 pt-5">
        <button
          type="button"
          onClick={onRun}
          className="flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-sand-50 text-sm font-semibold text-forest-900 transition-colors hover:bg-sand-100"
        >
          <Play size={16} aria-hidden="true" />
          {running ? "Restart" : "Start simulation"}
        </button>
        {running && (
          <button
            type="button"
            onClick={onReset}
            aria-label="Clear the simulation"
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/15 text-sand-50 transition-colors hover:bg-white/10"
          >
            <RotateCcw size={16} aria-hidden="true" />
          </button>
        )}
      </div>
    </motion.aside>
  );
}
