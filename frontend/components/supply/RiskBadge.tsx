import { SUPPLY_RISK_STYLE } from "@/lib/supply/style";
import type { SupplyRisk } from "@/lib/supply/model";

export default function RiskBadge({ risk }: { risk: SupplyRisk }) {
  const s = SUPPLY_RISK_STYLE[risk];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold"
      style={{ color: s.ink, backgroundColor: `${s.color}2b` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: s.color }} aria-hidden="true" />
      {risk}
    </span>
  );
}
