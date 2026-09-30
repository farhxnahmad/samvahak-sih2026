"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import StatusBadge from "./StatusBadge";
import { STATUS, STATUS_KEYS, WATERWAY_COLOR } from "@/lib/geo";
import { EASE } from "@/lib/motion";
import type { Corridor } from "@/lib/types";

type Filter = "all" | "road" | "waterway";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "road", label: "Road" },
  { id: "waterway", label: "Waterway" },
];

interface CorridorListProps {
  corridors: Corridor[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}

export default function CorridorList({
  corridors,
  selectedId,
  onSelect,
  onHover,
}: CorridorListProps) {
  const [filter, setFilter] = useState<Filter>("all");
  const items = corridors.filter((c) => filter === "all" || c.mode === filter);

  return (
    <motion.aside
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.35, ease: EASE }}
      aria-label="Corridors"
      className="glass absolute bottom-4 left-4 top-[76px] z-20 hidden w-[320px] flex-col overflow-hidden rounded-xl lg:flex"
    >
      <div className="px-4 pb-3 pt-4">
        <h2 className="text-xl font-semibold">Corridors</h2>
        <p className="mt-1 text-sm text-forest-700">
          Road and waterway routes across the region.
        </p>
        <div
          role="group"
          aria-label="Filter corridors by mode"
          className="mt-3 flex gap-1 rounded-lg bg-forest-800/10 p-1"
        >
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={`flex-1 rounded-md px-2 py-1.5 text-sm font-medium transition-colors ${
                filter === f.id
                  ? "bg-sand-50 text-forest-900 shadow-sm"
                  : "text-forest-700 hover:text-forest-900"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <ul className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-2">
        {items.map((c) => {
          const active = c.id === selectedId;
          return (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onSelect(c.id)}
                onMouseEnter={() => onHover(c.id)}
                onMouseLeave={() => onHover(null)}
                onFocus={() => onHover(c.id)}
                onBlur={() => onHover(null)}
                aria-current={active ? "true" : undefined}
                className="relative w-full rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-forest-800/5"
              >
                {active && (
                  <motion.span
                    layoutId="active-corridor"
                    className="absolute inset-0 rounded-lg bg-forest-700/10 ring-1 ring-forest-700/25"
                    transition={{ type: "spring", stiffness: 420, damping: 36 }}
                  />
                )}
                <span className="relative flex items-start justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{c.name}</span>
                    <span className="block text-xs text-forest-700">
                      {c.mode === "waterway" ? "Waterway" : "Road"} in {c.states.join(", ")}
                    </span>
                  </span>
                  <StatusBadge status={c.status} />
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap gap-x-4 gap-y-1.5 border-t border-forest-800/10 px-4 py-3 text-xs text-forest-800">
        {STATUS_KEYS.map((key) => (
          <span key={key} className="flex items-center gap-1.5">
            <span
              className="h-[3px] w-4 rounded-full"
              style={{ backgroundColor: STATUS[key].color }}
              aria-hidden="true"
            />
            {STATUS[key].label}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span
            className="w-4 border-t-[3px] border-dotted"
            style={{ borderColor: WATERWAY_COLOR }}
            aria-hidden="true"
          />
          Waterway
        </span>
      </div>
    </motion.aside>
  );
}
