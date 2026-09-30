"use client";

import { motion } from "framer-motion";
import { EDGES } from "@/lib/isolation/network";
import { LINES_BY_EDGE } from "@/lib/supply/model";
import { EASE } from "@/lib/motion";

export default function SupplyTray({ onSelect }: { onSelect: (id: string) => void }) {
  const roads = EDGES.map((edge) => ({
    edge,
    depots: new Set(LINES_BY_EDGE[edge.id].map((l) => l.depotId)).size,
  })).sort((a, b) => b.depots - a.depots);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.35, ease: EASE }}
      className="absolute inset-x-0 bottom-7 z-20 lg:hidden"
    >
      <p className="px-4 pb-1 text-xs font-medium text-forest-900">
        Choose a supply route to test <span className="sm:hidden">(sample data)</span>
      </p>
      <ul
        aria-label="Supply routes"
        className="flex snap-x snap-mandatory gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {roads.map(({ edge, depots }) => (
          <li key={edge.id} className="shrink-0 snap-start">
            <button
              type="button"
              onClick={() => onSelect(edge.id)}
              className="glass w-[220px] rounded-xl p-3 text-left"
            >
              <span className="block text-sm font-medium">{edge.name}</span>
              <span className="mt-1 block text-xs text-forest-700">
                Feeds {depots} {depots === 1 ? "depot" : "depots"}, {Math.round(edge.lengthKm)} km
              </span>
            </button>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}
