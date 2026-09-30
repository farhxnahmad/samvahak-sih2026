"use client";

import { GOODS, type GoodId } from "@/lib/supply/goods";
import { GOOD_ICON } from "./goodIcons";

interface GoodsBarProps {
  goodId: GoodId;
  onChange: (id: GoodId) => void;
}

export default function GoodsBar({ goodId, onChange }: GoodsBarProps) {
  return (
    <div
      role="group"
      aria-label="Goods shown on the map"
      className="glass absolute left-3 top-[76px] z-20 flex gap-1 rounded-xl p-1 lg:bottom-4 lg:left-1/2 lg:top-auto lg:-translate-x-1/2"
    >
      {GOODS.map((g) => {
        const Icon = GOOD_ICON[g.id];
        const active = g.id === goodId;
        return (
          <button
            key={g.id}
            type="button"
            aria-pressed={active}
            aria-label={g.label}
            onClick={() => onChange(g.id)}
            className={`flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors ${
              active ? "bg-forest-800 text-sand-50" : "text-forest-800 hover:bg-forest-800/10"
            }`}
          >
            <Icon size={16} aria-hidden="true" />
            <span className="hidden xl:inline">{g.label}</span>
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: g.color, boxShadow: active ? "0 0 0 1.5px #f8f4ea" : undefined }}
              aria-hidden="true"
            />
          </button>
        );
      })}
    </div>
  );
}
