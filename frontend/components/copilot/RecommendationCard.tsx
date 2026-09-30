"use client";

import { motion } from "framer-motion";
import type { RecommendationCard as Card } from "@/lib/copilot/types";
import { EASE } from "@/lib/motion";

const PRIORITY_COLOR: Record<Card["priority"], string> = {
  Now: "#e0523f",
  Today: "#e2842a",
  Watch: "#4f9dc2",
};

const CONFIDENCE_COLOR: Record<Card["confidence"]["label"], string> = {
  High: "#5fbf86",
  Medium: "#e0b93a",
  Low: "#e2842a",
};

export default function RecommendationCard({ card, index }: { card: Card; index: number }) {
  const conf = card.confidence;
  const segments = 10;
  const filled = Math.round((conf.value / 100) * segments);

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.05 * index, ease: EASE }}
      className="overflow-hidden rounded-lg border border-white/10 bg-white/5"
      style={{ borderLeft: `3px solid ${PRIORITY_COLOR[card.priority]}` }}
    >
      <header className="flex items-center justify-between gap-3 border-b border-white/10 px-3 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-sand-300">{card.category}</span>
        <span
          className="text-[11px] font-bold uppercase tracking-wider"
          style={{ color: PRIORITY_COLOR[card.priority] }}
        >
          {card.priority}
        </span>
      </header>

      <div className="space-y-3 px-3 py-3">
        <section>
          <h4 className="text-[10px] font-semibold uppercase tracking-widest text-sand-300">Recommended action</h4>
          <p className="mt-1 text-sm font-medium leading-relaxed">{card.action}</p>
        </section>
        <section>
          <h4 className="text-[10px] font-semibold uppercase tracking-widest text-sand-300">Expected outcome</h4>
          <p className="mt-1 text-sm leading-relaxed text-sand-100">{card.outcome}</p>
        </section>
        <section>
          <h4 className="text-[10px] font-semibold uppercase tracking-widest text-sand-300">Confidence level</h4>
          <div className="mt-1.5 flex items-center gap-3">
            <div
              className="flex flex-1 gap-0.5"
              role="img"
              aria-label={`Confidence ${conf.value} percent, ${conf.label}`}
            >
              {Array.from({ length: segments }, (_, i) => (
                <span
                  key={i}
                  className="h-2 flex-1 rounded-[2px]"
                  style={{ backgroundColor: i < filled ? CONFIDENCE_COLOR[conf.label] : "rgba(248,244,234,0.14)" }}
                />
              ))}
            </div>
            <span className="w-24 shrink-0 text-right text-xs font-semibold tabular-nums" style={{ color: CONFIDENCE_COLOR[conf.label] }}>
              {conf.value}% {conf.label}
            </span>
          </div>
          <details className="mt-2 text-xs text-sand-300">
            <summary className="cursor-pointer select-none hover:text-sand-100">What this rests on</summary>
            <ul className="mt-1.5 list-disc space-y-1 pl-4 leading-relaxed">
              {conf.basis.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </details>
        </section>
      </div>
    </motion.article>
  );
}
