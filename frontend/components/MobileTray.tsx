"use client";

import { motion } from "framer-motion";
import StatusBadge from "./StatusBadge";
import { EASE } from "@/lib/motion";
import type { Corridor } from "@/lib/types";

interface MobileTrayProps {
  corridors: Corridor[];
  onSelect: (id: string) => void;
}

export default function MobileTray({ corridors, onSelect }: MobileTrayProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.35, ease: EASE }}
      className="absolute inset-x-0 bottom-7 z-20 lg:hidden"
    >
      <p className="px-4 pb-1 text-xs font-medium text-forest-900 sm:hidden">Sample data</p>
      <ul
        aria-label="Corridors"
        className="flex snap-x snap-mandatory gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {corridors.map((c) => (
          <li key={c.id} className="shrink-0 snap-start">
            <button
              type="button"
              onClick={() => onSelect(c.id)}
              className="glass w-[248px] rounded-xl p-3 text-left"
            >
              <span className="flex items-start justify-between gap-2">
                <span className="text-sm font-medium">{c.name}</span>
                <StatusBadge status={c.status} />
              </span>
              <span className="mt-1 block text-xs text-forest-700">
                {c.mode === "waterway" ? "Waterway" : "Road"} in {c.states.join(", ")}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}
