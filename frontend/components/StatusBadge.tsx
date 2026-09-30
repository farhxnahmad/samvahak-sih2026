import { STATUS } from "@/lib/geo";
import type { CorridorStatus } from "@/lib/types";

export default function StatusBadge({ status }: { status: CorridorStatus }) {
  const s = STATUS[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium"
      style={{ color: s.ink, backgroundColor: `${s.color}1f` }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: s.color }}
        aria-hidden="true"
      />
      {s.label}
    </span>
  );
}
