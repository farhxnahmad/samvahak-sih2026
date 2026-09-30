import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { trendOf } from "@/lib/risk/model";

interface TrendIndicatorProps {
  changePct: number;
  reference?: string;
}

export default function TrendIndicator({ changePct, reference }: TrendIndicatorProps) {
  const trend = trendOf(changePct);
  const abs = Math.abs(changePct);

  if (trend === "steady") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-forest-700">
        <Minus size={14} aria-hidden="true" />
        Steady
        {reference ? <span className="sr-only"> {reference}</span> : null}
      </span>
    );
  }

  const Icon = trend === "up" ? TrendingUp : TrendingDown;
  const color = trend === "up" ? "#9b2a1e" : "#2b6b45";
  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-medium tabular-nums"
      style={{ color }}
    >
      <Icon size={14} aria-hidden="true" />
      {trend === "up" ? "+" : "-"}
      {abs}%
      <span className="sr-only">
        {trend === "up" ? " increase" : " decrease"}
        {reference ? ` ${reference}` : ""}
      </span>
    </span>
  );
}
