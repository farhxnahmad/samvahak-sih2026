"use client";

import { motion } from "framer-motion";
import { X, ArrowRight, TriangleAlert } from "lucide-react";
import StatusBadge from "./StatusBadge";
import { hubById, incidents } from "@/lib/data";
import { pathLengthKm } from "@/lib/geo";
import { EASE } from "@/lib/motion";
import type { Corridor } from "@/lib/types";

interface CorridorDetailProps {
  corridor: Corridor;
  onClose: () => void;
}

export default function CorridorDetail({ corridor, onClose }: CorridorDetailProps) {
  const related = incidents.filter((i) => i.corridorId === corridor.id);
  const approxKm = Math.round(pathLengthKm(corridor.path) / 5) * 5;

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 14 }}
      transition={{ duration: 0.3, ease: EASE }}
      aria-label={`${corridor.name} details`}
      className="glass absolute inset-x-3 bottom-7 z-20 max-h-[52dvh] overflow-y-auto rounded-xl p-4 lg:inset-x-auto lg:bottom-auto lg:right-4 lg:top-[76px] lg:max-h-[calc(100dvh-92px)] lg:w-[340px]"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-forest-700">
            {corridor.mode === "waterway" ? "Waterway corridor" : "Road corridor"}
          </p>
          <h2 className="mt-0.5 text-xl font-semibold leading-snug">{corridor.name}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close corridor details"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-forest-800 transition-colors hover:bg-forest-800/10"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <StatusBadge status={corridor.status} />
        <span className="flex items-center gap-1.5 text-sm text-forest-800">
          {corridor.from}
          <ArrowRight size={14} aria-hidden="true" />
          {corridor.to}
        </span>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-forest-800">{corridor.advisory}</p>

      <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-forest-800/10 pt-4 text-sm">
        <div>
          <dt className="text-xs text-forest-700">Approx. length</dt>
          <dd className="mt-0.5 font-medium tabular-nums">{approxKm} km</dd>
        </div>
        <div>
          <dt className="text-xs text-forest-700">States crossed</dt>
          <dd className="mt-0.5 font-medium">{corridor.states.join(", ")}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-xs text-forest-700">Hubs on route</dt>
          <dd className="mt-0.5 font-medium">
            {corridor.hubIds.map((id) => hubById[id].name).join(", ")}
          </dd>
        </div>
      </dl>

      {related.length > 0 && (
        <div className="mt-4 border-t border-forest-800/10 pt-4">
          <h3 className="text-sm font-semibold">Open incidents</h3>
          <ul className="mt-2 space-y-2">
            {related.map((i) => (
              <li key={i.id} className="flex items-start gap-2.5 text-sm">
                <TriangleAlert
                  size={16}
                  className="mt-0.5 shrink-0 text-[#b0432f]"
                  aria-hidden="true"
                />
                <span>
                  <span className="block font-medium">{i.title}</span>
                  <span className="block text-xs text-forest-700">{i.type}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </motion.section>
  );
}
