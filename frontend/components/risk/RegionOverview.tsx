"use client";

import { motion } from "framer-motion";
import InsightsPanel from "./InsightsPanel";
import { scoreAt, type DistrictRisk, type Horizon } from "@/lib/risk/engine";
import { regionInsights } from "@/lib/risk/insights";
import { CATEGORY, CATEGORY_KEYS, categoryOf } from "@/lib/risk/model";
import { EASE } from "@/lib/motion";

interface RegionOverviewProps {
  risks: DistrictRisk[];
  horizon: Horizon;
}

export default function RegionOverview({ risks, horizon }: RegionOverviewProps) {
  const counts = { low: 0, moderate: 0, high: 0, critical: 0 };
  risks.forEach((d) => {
    counts[categoryOf(scoreAt(d, horizon))] += 1;
  });

  return (
    <motion.aside
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.45, ease: EASE }}
      aria-label="Region overview"
      className="glass absolute right-4 top-[76px] z-20 hidden max-h-[calc(100dvh-92px)] w-[340px] overflow-y-auto rounded-xl p-4 lg:block"
    >
      <h2 className="text-xl font-semibold">Region overview</h2>
      <p className="mt-1 text-sm text-forest-700">
        {horizon === 0 ? "Current risk across all districts." : `Projected risk in ${horizon} hours.`}
      </p>

      <ul className="mt-4 space-y-3">
        {CATEGORY_KEYS.map((key) => (
          <li key={key}>
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-medium">
                {CATEGORY[key].label}
                <span className="ml-2 text-xs font-normal text-forest-700">
                  {CATEGORY[key].range}
                </span>
              </span>
              <span className="tabular-nums">{counts[key]}</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-forest-800/10">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${(counts[key] / risks.length) * 100}%`,
                  backgroundColor: CATEGORY[key].color,
                }}
              />
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-5">
        <InsightsPanel items={regionInsights(risks, horizon)} />
      </div>
    </motion.aside>
  );
}
