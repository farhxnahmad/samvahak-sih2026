"use client";

import { HORIZONS, horizonLabel, type Horizon } from "@/lib/risk/engine";

interface HorizonBarProps {
  horizon: Horizon;
  onChange: (h: Horizon) => void;
}

export default function HorizonBar({ horizon, onChange }: HorizonBarProps) {
  return (
    <div
      role="group"
      aria-label="Prediction time"
      className="glass absolute left-3 top-[76px] z-20 flex items-center gap-1 rounded-xl p-1 lg:bottom-4 lg:left-1/2 lg:top-auto lg:-translate-x-1/2"
    >
      <span className="hidden px-3 text-sm text-forest-700 lg:inline">Prediction</span>
      {HORIZONS.map((h) => {
        const active = h === horizon;
        return (
          <button
            key={h}
            type="button"
            aria-pressed={active}
            aria-label={h === 0 ? "Now" : `In ${h} hours`}
            onClick={() => onChange(h)}
            className={`h-9 rounded-lg px-3.5 text-sm font-medium tabular-nums transition-colors ${
              active ? "bg-forest-800 text-sand-50" : "text-forest-800 hover:bg-forest-800/10"
            }`}
          >
            {horizonLabel(h)}
          </button>
        );
      })}
    </div>
  );
}
