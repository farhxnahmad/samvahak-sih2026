"use client";

import { Route, Waves, MapPin, TriangleAlert, type LucideIcon } from "lucide-react";
import type { Layers } from "@/lib/types";

const ITEMS: { key: keyof Layers; label: string; Icon: LucideIcon }[] = [
  { key: "roads", label: "Roads", Icon: Route },
  { key: "waterways", label: "Waterways", Icon: Waves },
  { key: "hubs", label: "Hubs", Icon: MapPin },
  { key: "incidents", label: "Incidents", Icon: TriangleAlert },
];

interface LayerBarProps {
  layers: Layers;
  onToggle: (key: keyof Layers) => void;
}

export default function LayerBar({ layers, onToggle }: LayerBarProps) {
  return (
    <div
      role="group"
      aria-label="Map layers"
      className="glass absolute left-3 top-[76px] z-20 flex gap-1 rounded-xl p-1 lg:bottom-4 lg:left-1/2 lg:top-auto lg:-translate-x-1/2"
    >
      {ITEMS.map(({ key, label, Icon }) => {
        const active = layers[key];
        return (
          <button
            key={key}
            type="button"
            aria-pressed={active}
            aria-label={label}
            onClick={() => onToggle(key)}
            className={`flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors ${
              active
                ? "bg-forest-800 text-sand-50"
                : "text-forest-800 hover:bg-forest-800/10"
            }`}
          >
            <Icon size={16} aria-hidden="true" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
