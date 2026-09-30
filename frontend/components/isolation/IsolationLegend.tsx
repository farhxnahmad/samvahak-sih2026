import { VILLAGE_STYLE } from "@/lib/isolation/style";
import type { VillageState } from "@/lib/isolation/types";

const STATES: VillageState[] = ["connected", "at-risk", "isolated", "other"];

export default function IsolationLegend() {
  return (
    <ul
      aria-label="Map legend"
      className="glass absolute left-3 top-[76px] z-20 flex items-center gap-3 rounded-xl px-3 py-2 text-xs text-forest-900 lg:bottom-4 lg:left-1/2 lg:top-auto lg:-translate-x-1/2 lg:gap-4 lg:px-4"
    >
      {STATES.map((key) => (
        <li key={key} className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: VILLAGE_STYLE[key].color }}
            aria-hidden="true"
          />
          {VILLAGE_STYLE[key].label}
        </li>
      ))}
      <li className="hidden items-center gap-1.5 border-l border-forest-800/15 pl-4 lg:flex">
        <span
          className="h-2.5 w-2.5 rounded-full border-2 bg-sand-50"
          style={{ borderColor: "#1c5673" }}
          aria-hidden="true"
        />
        Hospital
      </li>
      <li className="hidden items-center gap-1.5 lg:flex">
        <span
          className="h-2.5 w-2.5 rounded-full border-2"
          style={{ borderColor: "#6b5d3f", backgroundColor: "#d6c8a5" }}
          aria-hidden="true"
        />
        Supply depot
      </li>
      <li className="hidden items-center gap-1.5 lg:flex">
        <span className="h-[3px] w-4 rounded-full" style={{ backgroundColor: "#2b7fa8" }} aria-hidden="true" />
        Route B
      </li>
    </ul>
  );
}
