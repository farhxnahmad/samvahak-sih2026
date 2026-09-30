"use client";

import { motion } from "framer-motion";
import { hubById } from "@/lib/data";
import { GOODS } from "@/lib/supply/goods";
import { DEPOTS } from "@/lib/supply/depots";
import { LINES } from "@/lib/supply/model";
import { EASE } from "@/lib/motion";

export default function SupplyIntro() {
  return (
    <motion.aside
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.45, ease: EASE }}
      aria-label="Essential goods overview"
      className="glass absolute right-4 top-[76px] z-20 hidden max-h-[calc(100dvh-92px)] w-[360px] overflow-y-auto rounded-xl p-4 lg:block"
    >
      <h2 className="text-xl font-semibold">Essential goods</h2>
      <p className="mt-1 text-sm text-forest-700">
        {DEPOTS.length} depots and {LINES.filter((l) => !l.self).length} supply lines. Select a route to see what a failure would do to stock.
      </p>
      <ul className="mt-4 space-y-3">
        {GOODS.map((g) => (
          <li key={g.id} className="border-t border-forest-800/10 pt-3 first:border-t-0 first:pt-0">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: g.color }} aria-hidden="true" />
              {g.label}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-forest-700">
              Supplied from {g.sources.map((s) => hubById[s].name).join(", ")}. Safe level is {g.safeDays} days of cover.
            </p>
          </li>
        ))}
      </ul>
    </motion.aside>
  );
}
