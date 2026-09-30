"use client";

import { motion } from "framer-motion";
import { Pencil } from "lucide-react";
import LevelGauge, { levelColor } from "./LevelGauge";
import RecommendationCard from "./RecommendationCard";
import { FEED_LABEL } from "@/lib/copilot/utils";
import type { CopilotResponse, TransportOption } from "@/lib/copilot/types";
import { EASE } from "@/lib/motion";

const SUITABILITY_COLOR: Record<TransportOption["suitability"], string> = {
  Best: "#5fbf86",
  Possible: "#e0b93a",
  "Not advised": "#e0523f",
};

interface BriefingPanelProps {
  response: CopilotResponse;
  visibleOnMobile: boolean;
  onNewQuery: () => void;
}

export default function BriefingPanel({ response, visibleOnMobile, onNewQuery }: BriefingPanelProps) {
  const a = response.assessment;
  return (
    <motion.section
      key={response.id}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE }}
      aria-label="Briefing"
      className={`glass-dark absolute inset-x-3 bottom-7 z-20 max-h-[66dvh] overflow-y-auto rounded-xl p-4 lg:inset-x-auto lg:bottom-4 lg:right-4 lg:top-[76px] lg:block lg:max-h-none lg:w-[440px] ${
        visibleOnMobile ? "block" : "hidden"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-sand-300">
            Briefing {response.id.toUpperCase()}
          </p>
          <h2 className="mt-0.5 text-lg font-semibold leading-snug">{response.title}</h2>
        </div>
        <button
          type="button"
          onClick={onNewQuery}
          aria-label="Ask a new question"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sand-100 transition-colors hover:bg-white/10 lg:hidden"
        >
          <Pencil size={16} aria-hidden="true" />
        </button>
      </div>

      <p className="mt-2 rounded-md bg-white/5 px-3 py-2 font-mono text-xs leading-relaxed text-sand-200">
        {response.query}
      </p>
      <dl className="mt-2 flex flex-wrap gap-1.5">
        {response.understood.map((u) => (
          <div key={u.label} className="rounded-md border border-white/12 px-2 py-1 text-xs">
            <dt className="inline text-sand-300">{u.label}: </dt>
            <dd className="inline font-medium">{u.value}</dd>
          </div>
        ))}
      </dl>

      <section aria-label="Risk assessment" className="mt-4 rounded-lg border border-white/10 p-3">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-[11px] font-semibold uppercase tracking-widest text-sand-300">Risk assessment</h3>
          {a.score !== null && (
            <span className="font-display text-2xl font-semibold tabular-nums leading-none" style={{ color: levelColor(a.level) }}>
              {a.score}
            </span>
          )}
        </div>
        <div className="mt-3">
          <LevelGauge level={a.level} />
        </div>
        <p className="mt-3 text-sm font-medium leading-relaxed">{a.headline}</p>
        {a.points.length > 0 && (
          <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-sand-200">
            {a.points.map((p) => (
              <li key={p} className="flex gap-2">
                <span className="mt-1.5 h-1 w-2 shrink-0 bg-sand-300" aria-hidden="true" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {response.cards.length > 0 && (
        <section aria-label="Recommendations" className="mt-5">
          <h3 className="text-[11px] font-semibold uppercase tracking-widest text-sand-300">
            Recommendations ({response.cards.length})
          </h3>
          <div className="mt-2 space-y-3">
            {response.cards.map((card, i) => (
              <RecommendationCard key={card.id} card={card} index={i} />
            ))}
          </div>
        </section>
      )}

      {response.alternatives.length > 0 && (
        <section aria-label="Alternative transport" className="mt-5">
          <h3 className="text-[11px] font-semibold uppercase tracking-widest text-sand-300">Alternative transport</h3>
          <ul className="mt-2 space-y-2">
            {response.alternatives.map((alt) => (
              <li key={alt.mode} className="rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold">{alt.mode}</p>
                  <span className="shrink-0 text-[11px] font-bold uppercase tracking-wider" style={{ color: SUITABILITY_COLOR[alt.suitability] }}>
                    {alt.suitability}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-sand-300">Time: {alt.time}</p>
                <p className="mt-1 text-xs leading-relaxed text-sand-200">{alt.note}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-label="Context used" className="mt-5">
        <h3 className="text-[11px] font-semibold uppercase tracking-widest text-sand-300">Context used</h3>
        <ul className="mt-2 space-y-2">
          {response.context.map((c) => (
            <li key={c.feed} className={`flex gap-3 text-xs leading-relaxed ${c.used ? "" : "opacity-50"}`}>
              <span
                className="mt-1 h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: c.used ? "#5fbf86" : "rgba(248,244,234,0.3)", boxShadow: c.used ? "0 0 6px #5fbf86" : undefined }}
                aria-label={c.used ? "Used" : "Not used"}
              />
              <span>
                <span className="font-semibold">{FEED_LABEL[c.feed]}. </span>
                <span className="text-sand-200">{c.detail}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {response.notes.length > 0 && (
        <ul className="mt-4 space-y-1 border-t border-white/10 pt-3 text-xs leading-relaxed text-sand-300">
          {response.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}

      <details className="mt-4 border-t border-white/10 pt-3 text-xs text-sand-300">
        <summary className="cursor-pointer select-none hover:text-sand-100">How this was decided</summary>
        <ol className="mt-2 list-decimal space-y-1 pl-4 leading-relaxed">
          {response.trace.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ol>
      </details>
    </motion.section>
  );
}
