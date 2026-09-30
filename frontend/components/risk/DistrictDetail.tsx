"use client";

import { motion } from "framer-motion";
import { X } from "lucide-react";
import CategoryBadge from "./CategoryBadge";
import TrendIndicator from "./TrendIndicator";
import InsightsPanel from "./InsightsPanel";
import ForecastChart from "./ForecastChart";
import { HORIZONS, horizonLabel, type DistrictRisk, type Horizon } from "@/lib/risk/engine";
import { districtInsights } from "@/lib/risk/insights";
import {
  CATEGORY,
  FACTOR_KEYS,
  FACTOR_LABEL,
  pointsOf,
  scoreColor,
} from "@/lib/risk/model";
import { EASE } from "@/lib/motion";

interface DistrictDetailProps {
  district: DistrictRisk;
  horizon: Horizon;
  onHorizon: (h: Horizon) => void;
  onClose: () => void;
}

export default function DistrictDetail({
  district,
  horizon,
  onHorizon,
  onClose,
}: DistrictDetailProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 14 }}
      transition={{ duration: 0.3, ease: EASE }}
      aria-label={`${district.name} risk details`}
      className="glass absolute inset-x-3 bottom-7 z-20 max-h-[58dvh] overflow-y-auto rounded-xl p-4 lg:inset-x-auto lg:bottom-4 lg:right-4 lg:top-[76px] lg:max-h-none lg:w-[368px]"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-forest-700">{district.state}</p>
          <h2 className="mt-0.5 text-xl font-semibold leading-snug">{district.name}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close district details"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-forest-800 transition-colors hover:bg-forest-800/10"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      <div className="mt-3 flex items-end gap-3">
        <p
          className="font-display text-5xl font-semibold leading-none tabular-nums"
          style={{ color: CATEGORY[district.category].ink }}
        >
          {district.score}
        </p>
        <div className="pb-1">
          <CategoryBadge category={district.category} />
          <div className="mt-1">
            <TrendIndicator changePct={district.changePct} reference="versus 24 hours ago" />
            <span className="ml-1.5 text-xs text-forest-700">vs 24h ago</span>
          </div>
        </div>
      </div>

      <div
        className="mt-3 h-1.5 overflow-hidden rounded-full bg-forest-800/10"
        role="img"
        aria-label={`Risk score ${district.score} out of 100`}
      >
        <div
          className="h-full rounded-full"
          style={{ width: `${district.score}%`, backgroundColor: scoreColor(district.score) }}
        />
      </div>

      <div className="mt-5">
        <InsightsPanel items={districtInsights(district)} />
      </div>

      <h3 className="mt-5 text-sm font-semibold">Contributing factors</h3>
      <ul className="mt-2 space-y-3">
        {FACTOR_KEYS.map((key) => {
          const value = district.factors[key];
          const isMain = key === district.mainFactor;
          return (
            <li key={key}>
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="font-medium">
                  {FACTOR_LABEL[key]}
                  {isMain && (
                    <span className="ml-2 text-xs font-normal text-river-700">Main factor</span>
                  )}
                </span>
                <span className="tabular-nums text-forest-700">
                  {pointsOf(district.factors, key)} pts
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-forest-800/10">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${value}%`, backgroundColor: scoreColor(value) }}
                />
              </div>
            </li>
          );
        })}
      </ul>

      <h3 className="mt-5 text-sm font-semibold">Forecast, next 72 hours</h3>
      <div className="mt-2">
        <ForecastChart district={district} />
      </div>
      <div
        role="group"
        aria-label="Show map at forecast time"
        className="mt-1 grid grid-cols-4 gap-1"
      >
        {HORIZONS.map((h) => {
          const point = district.forecast.find((p) => p.horizon === h);
          if (!point) return null;
          const active = h === horizon;
          return (
            <button
              key={h}
              type="button"
              aria-pressed={active}
              onClick={() => onHorizon(h)}
              className={`rounded-lg px-2 py-2 text-center transition-colors ${
                active ? "bg-forest-800 text-sand-50" : "bg-forest-800/5 hover:bg-forest-800/10"
              }`}
            >
              <span className="block text-xs opacity-80">{horizonLabel(h)}</span>
              <span className="block text-base font-semibold tabular-nums">{point.score}</span>
              <span className="block text-[11px] opacity-80">{CATEGORY[point.category].label}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-forest-700">
        Shaded band shows the expected range, widening with time.
      </p>
    </motion.section>
  );
}
