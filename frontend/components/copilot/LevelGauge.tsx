import type { Level } from "@/lib/copilot/types";

const LEVELS: Level[] = ["Low", "Moderate", "High", "Critical"];
const COLORS: Record<Level, string> = { Low: "#3f8f5f", Moderate: "#d1a91b", High: "#e2842a", Critical: "#e0523f" };

export function levelColor(level: Level): string {
  return COLORS[level];
}

export default function LevelGauge({ level }: { level: Level }) {
  const index = LEVELS.indexOf(level);
  return (
    <div role="img" aria-label={`Assessed level: ${level}`}>
      <div className="flex gap-1">
        {LEVELS.map((l, i) => (
          <span
            key={l}
            className="h-2 flex-1 rounded-sm transition-colors"
            style={{ backgroundColor: i <= index ? COLORS[l] : "rgba(248,244,234,0.14)" }}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] uppercase tracking-wider text-sand-300">
        {LEVELS.map((l) => (
          <span key={l} style={l === level ? { color: COLORS[l], fontWeight: 700 } : undefined}>
            {l}
          </span>
        ))}
      </div>
    </div>
  );
}
