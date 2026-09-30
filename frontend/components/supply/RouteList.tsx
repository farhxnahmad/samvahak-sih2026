"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { EDGES } from "@/lib/isolation/network";
import { GOODS } from "@/lib/supply/goods";
import { LINES_BY_EDGE } from "@/lib/supply/model";
import { EASE } from "@/lib/motion";

interface RouteListProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function RouteList({ selectedId, onSelect }: RouteListProps) {
  const roads = useMemo(
    () =>
      EDGES.map((edge) => {
        const lines = LINES_BY_EDGE[edge.id];
        return {
          edge,
          depots: new Set(lines.map((l) => l.depotId)).size,
          goods: new Set(lines.map((l) => l.goodId)),
        };
      }).sort((a, b) => b.depots - a.depots),
    []
  );

  return (
    <motion.aside
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.35, ease: EASE }}
      aria-label="Supply routes"
      className="glass absolute bottom-4 left-4 top-[76px] z-20 hidden w-[320px] flex-col overflow-hidden rounded-xl lg:flex"
    >
      <div className="px-4 pb-3 pt-4">
        <h2 className="text-xl font-semibold">Supply routes</h2>
        <p className="mt-1 text-sm text-forest-700">
          Roads that carry essential goods, busiest first. Pick one to test a failure.
        </p>
      </div>
      <ul className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-2">
        {roads.map(({ edge, depots, goods }) => {
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
                    layoutId="active-supply-road"
                    className="absolute inset-0 rounded-lg bg-forest-700/10 ring-1 ring-forest-700/25"
                    transition={{ type: "spring", stiffness: 420, damping: 36 }}
                  />
                )}
                <span className="relative flex items-start justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{edge.name}</span>
                    <span className="block text-xs text-forest-700">
                      {depots === 0 ? "No depot depends on it" : `Feeds ${depots} ${depots === 1 ? "depot" : "depots"}`}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1 pt-1" aria-hidden="true">
                    {GOODS.map((g) => (
                      <span
                        key={g.id}
                        className="h-2 w-2 rounded-full border"
                        style={{
                          borderColor: g.color,
                          backgroundColor: goods.has(g.id) ? g.color : "transparent",
                        }}
                      />
                    ))}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <ul className="flex flex-wrap gap-x-3 gap-y-1 border-t border-forest-800/10 px-4 py-3 text-xs text-forest-800">
        {GOODS.map((g) => (
          <li key={g.id} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: g.color }} aria-hidden="true" />
            {g.label}
          </li>
        ))}
      </ul>
    </motion.aside>
  );
}
