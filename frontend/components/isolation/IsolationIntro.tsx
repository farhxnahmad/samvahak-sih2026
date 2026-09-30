"use client";

import { motion } from "framer-motion";
import { fmt } from "@/lib/format";
import { EDGES } from "@/lib/isolation/network";
import { VILLAGES } from "@/lib/isolation/villages";
import { EASE } from "@/lib/motion";

export default function IsolationIntro() {
  const people = VILLAGES.reduce((sum, v) => sum + v.population, 0);
  return (
    <motion.aside
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.45, ease: EASE }}
      aria-label="Village isolation overview"
      className="glass absolute right-4 top-[76px] z-20 hidden w-[340px] rounded-xl p-4 lg:block"
    >
      <h2 className="text-xl font-semibold">Village isolation</h2>
      <p className="mt-1 text-sm text-forest-700">
        Test what happens to villages when a stretch of road is blocked.
      </p>
      <ol className="mt-4 space-y-2 text-sm text-forest-800">
        <li>1. Select a road on the map or in the list.</li>
        <li>2. Simulate a blockage and set where it is and how long.</li>
        <li>3. Read the impact and the recommended response.</li>
      </ol>
      <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-forest-800/10 pt-4 text-sm">
        <div>
          <dt className="text-xs text-forest-700">Villages</dt>
          <dd className="mt-0.5 font-display text-2xl font-semibold tabular-nums">{VILLAGES.length}</dd>
        </div>
        <div>
          <dt className="text-xs text-forest-700">People</dt>
          <dd className="mt-0.5 font-display text-2xl font-semibold tabular-nums">{fmt(people)}</dd>
        </div>
        <div>
          <dt className="text-xs text-forest-700">Roads</dt>
          <dd className="mt-0.5 font-display text-2xl font-semibold tabular-nums">{EDGES.length}</dd>
        </div>
      </dl>
    </motion.aside>
  );
}
