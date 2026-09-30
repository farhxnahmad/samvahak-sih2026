import { VILLAGE_STYLE } from "@/lib/isolation/style";
import type { VillageState } from "@/lib/isolation/types";

export default function VillageStateBadge({ state }: { state: VillageState }) {
  const s = VILLAGE_STYLE[state];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium"
      style={{ color: s.ink, backgroundColor: `${s.color}26` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: s.color }} aria-hidden="true" />
      {s.label}
    </span>
  );
}
