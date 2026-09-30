"use client";

import { Pause, Play, RotateCcw } from "lucide-react";
import { STEPS } from "@/lib/disaster/types";

interface TimelineBarProps {
  stepIndex: number;
  playing: boolean;
  onStep: (index: number) => void;
  onTogglePlay: () => void;
  onRestart: () => void;
}

export default function TimelineBar({ stepIndex, playing, onStep, onTogglePlay, onRestart }: TimelineBarProps) {
  const progress = (stepIndex / (STEPS.length - 1)) * 100;

  return (
    <div
      role="group"
      aria-label="Replay timeline"
      className="glass-dark absolute left-3 top-[76px] z-20 rounded-xl p-1.5 lg:bottom-4 lg:left-1/2 lg:top-auto lg:-translate-x-1/2"
    >
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onTogglePlay}
          aria-label={playing ? "Pause replay" : "Play replay"}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-sand-50 transition-colors hover:bg-white/10"
        >
          {playing ? <Pause size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
        </button>
        <button
          type="button"
          onClick={onRestart}
          aria-label="Restart replay"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-sand-50 transition-colors hover:bg-white/10"
        >
          <RotateCcw size={15} aria-hidden="true" />
        </button>
        <span className="mx-1 h-5 w-px bg-white/15" aria-hidden="true" />
        {STEPS.map((hour, i) => {
          const active = i === stepIndex;
          return (
            <button
              key={hour}
              type="button"
              aria-pressed={active}
              onClick={() => onStep(i)}
              className={`h-9 min-w-[48px] rounded-lg px-2 text-sm font-medium tabular-nums transition-colors ${
                active
                  ? "bg-sand-50 text-forest-900"
                  : i < stepIndex
                    ? "text-sand-50 hover:bg-white/10"
                    : "text-sand-300 hover:bg-white/10"
              }`}
            >
              {hour}h
            </button>
          );
        })}
      </div>
      <div className="mx-2 mt-1.5 h-0.5 overflow-hidden rounded-full bg-white/15" aria-hidden="true">
        <div
          className="h-full rounded-full bg-[#e2842a] transition-[width] duration-700"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
