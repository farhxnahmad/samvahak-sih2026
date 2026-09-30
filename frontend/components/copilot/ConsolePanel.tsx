"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ChevronRight, Mic, Square } from "lucide-react";
import { levelColor } from "./LevelGauge";
import { SUGGESTIONS } from "@/lib/copilot/engine";
import type { CopilotResponse } from "@/lib/copilot/types";
import { useSpeech } from "@/lib/copilot/useSpeech";
import { EASE } from "@/lib/motion";

interface ConsolePanelProps {
  log: CopilotResponse[];
  activeId: string | null;
  onSubmit: (text: string) => void;
  onSelect: (id: string) => void;
  visibleOnMobile: boolean;
  onShowBriefing: () => void;
}

export default function ConsolePanel({ log, activeId, onSubmit, onSelect, visibleOnMobile, onShowBriefing }: ConsolePanelProps) {
  const [text, setText] = useState("");

  const speech = useSpeech((heard) => {
    setText(heard);
    onSubmit(heard);
  });

  useEffect(() => {
    if (speech.listening) setText(speech.interim);
  }, [speech.listening, speech.interim]);

  const run = (value: string) => {
    onSubmit(value);
    setText("");
  };

  const status = speech.listening ? "Listening" : "Ready";

  return (
    <motion.aside
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.3, ease: EASE }}
      aria-label="Query console"
      className={`glass-dark absolute inset-x-3 bottom-7 z-20 max-h-[66dvh] flex-col overflow-y-auto rounded-xl p-4 lg:inset-x-auto lg:bottom-4 lg:left-4 lg:top-[76px] lg:flex lg:max-h-none lg:w-[340px] ${
        visibleOnMobile ? "flex" : "hidden"
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-sand-300">Query console</p>
          <h2 className="text-xl font-semibold">Logistics co-pilot</h2>
        </div>
        <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider" aria-live="polite">
          <span
            className="h-2 w-2 rounded-full"
            style={{
              backgroundColor: speech.listening ? "#e0523f" : "#5fbf86",
              boxShadow: `0 0 6px ${speech.listening ? "#e0523f" : "#5fbf86"}`,
            }}
            aria-hidden="true"
          />
          {status}
        </span>
      </div>

      <form
        className="mt-4"
        onSubmit={(e) => {
          e.preventDefault();
          run(text);
        }}
      >
        <label htmlFor="copilot-query" className="text-xs text-sand-300">
          Ask about routes, districts, supplies, roads or villages
        </label>
        <div className="mt-1.5 flex items-center gap-1.5 rounded-lg border border-white/15 bg-black/20 px-2 focus-within:border-sand-100">
          <ChevronRight size={16} className="shrink-0 text-sand-300" aria-hidden="true" />
          <input
            id="copilot-query"
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Safest route from Guwahati to Tawang"
            autoComplete="off"
            className="h-11 min-w-0 flex-1 bg-transparent font-mono text-sm text-sand-50 placeholder:text-sand-300/60 focus:outline-none"
          />
          <button
            type="button"
            onClick={speech.listening ? speech.stop : speech.start}
            disabled={!speech.supported}
            aria-label={speech.listening ? "Stop voice input" : "Start voice input"}
            aria-pressed={speech.listening}
            title={speech.supported ? "Speak your question" : "Voice input is not supported in this browser. Try Chrome or Edge."}
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
              speech.listening ? "bg-[#e0523f] text-white" : "text-sand-100 hover:bg-white/10"
            }`}
          >
            {speech.listening ? <Square size={14} aria-hidden="true" /> : <Mic size={16} aria-hidden="true" />}
          </button>
        </div>
        <button
          type="submit"
          disabled={text.trim() === ""}
          className="mt-2 h-10 w-full rounded-lg bg-sand-50 text-sm font-semibold text-forest-900 transition-colors hover:bg-sand-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Run query
        </button>
        {speech.error && (
          <p role="alert" className="mt-2 text-xs leading-relaxed text-[#f0a15a]">
            {speech.error}
          </p>
        )}
        <p className="mt-2 text-[11px] leading-relaxed text-sand-300">
          {speech.supported
            ? "Voice input uses your browser's speech service, which may send audio to its provider."
            : "Voice input needs a browser with speech recognition, such as Chrome or Edge."}
        </p>
      </form>

      <section aria-label="Quick queries" className="mt-5">
        <h3 className="text-[11px] font-semibold uppercase tracking-widest text-sand-300">Quick queries</h3>
        <ul className="mt-2 space-y-1">
          {SUGGESTIONS.map((s) => (
            <li key={s}>
              <button
                type="button"
                onClick={() => run(s)}
                className="w-full rounded-md border border-white/10 px-3 py-2 text-left text-xs leading-snug text-sand-100 transition-colors hover:border-white/25 hover:bg-white/5"
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="Mission log" className="mt-5 min-h-0 flex-1">
        <h3 className="text-[11px] font-semibold uppercase tracking-widest text-sand-300">Mission log</h3>
        {log.length === 0 ? (
          <p className="mt-2 text-xs text-sand-300">No queries yet.</p>
        ) : (
          <ul className="mt-2 space-y-1">
            {log.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(r.id);
                    onShowBriefing();
                  }}
                  aria-current={r.id === activeId ? "true" : undefined}
                  className={`flex w-full items-start gap-2 rounded-md px-2 py-2 text-left text-xs transition-colors ${
                    r.id === activeId ? "bg-white/10" : "hover:bg-white/5"
                  }`}
                >
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: levelColor(r.assessment.level) }} aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="block font-mono text-[10px] uppercase tracking-wider text-sand-300">
                      {r.id.toUpperCase()} {r.intentLabel}, {r.assessment.level}
                    </span>
                    <span className="block truncate text-sand-100">{r.query}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </motion.aside>
  );
}
