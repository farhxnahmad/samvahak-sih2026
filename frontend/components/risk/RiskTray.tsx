"use client";

import { motion } from "framer-motion";
import CategoryBadge from "./CategoryBadge";
import TrendIndicator from "./TrendIndicator";
import { changeAt, scoreAt, type DistrictRisk, type Horizon } from "@/lib/risk/engine";
import { categoryOf } from "@/lib/risk/model";
import { EASE } from "@/lib/motion";

interface RiskTrayProps {
  risks: DistrictRisk[];
  horizon: Horizon;
  onSelect: (id: string) => void;
}

export default function RiskTray({ risks, horizon, onSelect }: RiskTrayProps) {
  const top = [...risks].sort((a, b) => scoreAt(b, horizon) - scoreAt(a, horizon)).slice(0, 12);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.35, ease: EASE }}
      className="absolute inset-x-0 bottom-7 z-20 lg:hidden"
    >
      <p className="px-4 pb-1 text-xs font-medium text-forest-900">
        Highest risk districts <span className="sm:hidden">(sample data)</span>
      </p>
      <ul
        aria-label="Highest risk districts"
        className="flex snap-x snap-mandatory gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {top.map((d) => {
          const score = scoreAt(d, horizon);
          return (
            <li key={d.id} className="shrink-0 snap-start">
              <button
                type="button"
                onClick={() => onSelect(d.id)}
                className="glass w-[220px] rounded-xl p-3 text-left"
              >
                <span className="flex items-start justify-between gap-2">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{d.name}</span>
                    <span className="block truncate text-xs text-forest-700">{d.state}</span>
                  </span>
                  <span className="font-display text-2xl font-semibold leading-none tabular-nums">
                    {score}
                  </span>
                </span>
                <span className="mt-2 flex items-center justify-between">
                  <CategoryBadge category={categoryOf(score)} />
                  <TrendIndicator
                    changePct={changeAt(d, horizon)}
                    reference={horizon === 0 ? "versus 24 hours ago" : "versus now"}
                  />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </motion.div>
  );
}
