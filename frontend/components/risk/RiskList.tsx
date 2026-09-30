"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import CategoryBadge from "./CategoryBadge";
import TrendIndicator from "./TrendIndicator";
import { changeAt, scoreAt, type DistrictRisk, type Horizon } from "@/lib/risk/engine";
import {
  CATEGORY,
  CATEGORY_KEYS,
  FACTOR_LABEL,
  categoryOf,
  scoreColor,
  type RiskCategory,
} from "@/lib/risk/model";
import { EASE } from "@/lib/motion";

interface RiskListProps {
  risks: DistrictRisk[];
  horizon: Horizon;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function RiskList({ risks, horizon, selectedId, onSelect }: RiskListProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<RiskCategory | "all">("all");

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return risks
      .filter((d) => {
        if (q && !`${d.name} ${d.state}`.toLowerCase().includes(q)) return false;
        if (category !== "all" && categoryOf(scoreAt(d, horizon)) !== category) return false;
        return true;
      })
      .sort((a, b) => scoreAt(b, horizon) - scoreAt(a, horizon));
  }, [risks, horizon, query, category]);

  const reference = horizon === 0 ? "versus 24 hours ago" : "versus now";

  return (
    <motion.aside
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.35, ease: EASE }}
      aria-label="District risk ranking"
      className="glass absolute bottom-4 left-4 top-[76px] z-20 hidden w-[320px] flex-col overflow-hidden rounded-xl lg:flex"
    >
      <div className="px-4 pb-3 pt-4">
        <h2 className="text-xl font-semibold">District risk</h2>
        <p className="mt-1 text-sm text-forest-700">
          {horizon === 0 ? "Current scores, highest first." : `Projected for ${horizon} hours from now.`}
        </p>
        <div className="mt-3 flex gap-2">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Search districts</span>
            <Search
              size={15}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-forest-700"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search districts"
              className="h-9 w-full rounded-lg border border-forest-800/15 bg-sand-50/80 pl-8 pr-2 text-sm placeholder:text-forest-700/70"
            />
          </label>
          <label>
            <span className="sr-only">Filter by risk category</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as RiskCategory | "all")}
              className="h-9 rounded-lg border border-forest-800/15 bg-sand-50/80 px-2 text-sm"
            >
              <option value="all">All</option>
              {CATEGORY_KEYS.map((key) => (
                <option key={key} value={key}>
                  {CATEGORY[key].label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <ul className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-2">
        {items.length === 0 && (
          <li className="px-3 py-6 text-center text-sm text-forest-700">No districts match.</li>
        )}
        {items.map((d) => {
          const score = scoreAt(d, horizon);
          const active = d.id === selectedId;
          return (
            <li key={d.id}>
              <button
                type="button"
                onClick={() => onSelect(d.id)}
                aria-current={active ? "true" : undefined}
                className="relative w-full rounded-lg py-2.5 pl-4 pr-3 text-left transition-colors hover:bg-forest-800/5"
              >
                {active && (
                  <motion.span
                    layoutId="active-district"
                    className="absolute inset-0 rounded-lg bg-forest-700/10 ring-1 ring-forest-700/25"
                    transition={{ type: "spring", stiffness: 420, damping: 36 }}
                  />
                )}
                <span
                  className="absolute bottom-2 left-1 top-2 w-[3px] rounded-full"
                  style={{ backgroundColor: scoreColor(score) }}
                  aria-hidden="true"
                />
                <span className="relative flex items-center justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{d.name}</span>
                    <span className="block truncate text-xs text-forest-700">
                      {d.state} · {FACTOR_LABEL[d.mainFactor]}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-0.5">
                    <span className="flex items-center gap-2">
                      <span className="font-display text-lg font-semibold tabular-nums leading-none">
                        {score}
                      </span>
                    </span>
                    <TrendIndicator changePct={changeAt(d, horizon)} reference={reference} />
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="border-t border-forest-800/10 px-4 py-3">
        <div
          className="h-2 rounded-full"
          style={{
            background: `linear-gradient(90deg, ${scoreColor(0)}, ${scoreColor(40)}, ${scoreColor(65)}, ${scoreColor(100)})`,
          }}
          aria-hidden="true"
        />
        <ul className="mt-2 grid grid-cols-4 gap-1 text-[11px] text-forest-800">
          {CATEGORY_KEYS.map((key) => (
            <li key={key}>
              <span className="block font-medium">{CATEGORY[key].label}</span>
              <span className="block text-forest-700">{CATEGORY[key].range}</span>
            </li>
          ))}
        </ul>
      </div>
    </motion.aside>
  );
}
