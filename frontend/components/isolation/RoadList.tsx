"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { fmt } from "@/lib/format";
import { EDGES } from "@/lib/isolation/network";
import { DEPENDENTS, populationOf } from "@/lib/isolation/villages";
import { EASE } from "@/lib/motion";

interface RoadListProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function RoadList({ selectedId, onSelect }: RoadListProps) {
  const roads = useMemo(
    () =>
      EDGES.map((edge) => ({
        edge,
        villages: DEPENDENTS[edge.id].size,
        people: populationOf(DEPENDENTS[edge.id]),
      })).sort((a, b) => b.people - a.people),
    []
  );

  return (
    <motion.aside
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.35, ease: EASE }}
      aria-label="Roads"
      className="glass absolute bottom-4 left-4 top-[76px] z-20 hidden w-[320px] flex-col overflow-hidden rounded-xl lg:flex"
    >
      <div className="px-4 pb-3 pt-4">
        <h2 className="text-xl font-semibold">Roads</h2>
        <p className="mt-1 text-sm text-forest-700">
          Pick a road to see which villages depend on it, most people first.
        </p>
      </div>
      <ul className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-2">
        {roads.map(({ edge, villages, people }) => {
          const active = edge.id === selectedId;
          return (
            <li key={edge.id}>
              <button
                type="button"
                onClick={() => onSelect(edge.id)}
                aria-current={active ? "true" : undefined}
                className="relative w-full rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-forest-800/5"
              >
                {active && (
                  <motion.span
                    layoutId="active-road"
                    className="absolute inset-0 rounded-lg bg-forest-700/10 ring-1 ring-forest-700/25"
                    transition={{ type: "spring", stiffness: 420, damping: 36 }}
                  />
                )}
                <span className="relative flex items-start justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{edge.name}</span>
                    <span className="block text-xs text-forest-700">
                      {villages} villages, {fmt(people)} people
                    </span>
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-forest-700">
                    {Math.round(edge.lengthKm)} km
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </motion.aside>
  );
}
