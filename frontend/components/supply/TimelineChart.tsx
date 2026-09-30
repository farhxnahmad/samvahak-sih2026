"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import type { LineImpact } from "@/lib/supply/model";

interface TimelineChartProps {
  impact: LineImpact;
  color: string;
  closureHours: number;
}

export default function TimelineChart({ impact, color, closureHours }: TimelineChartProps) {
  const data = impact.seriesPct.slice(0, 73).map((pct, hour) => ({ hour, pct }));

  return (
    <div className="h-[168px] w-full" aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
          <CartesianGrid vertical={false} stroke="rgba(23,57,42,0.10)" />
          <XAxis
            dataKey="hour"
            type="number"
            domain={[0, 72]}
            ticks={[0, 12, 24, 48, 72]}
            tickFormatter={(v: number) => `${v}h`}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: "#1f4d39" }}
          />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            tickFormatter={(v: number) => `${v}%`}
            tickLine={false}
            axisLine={false}
            width={44}
            tick={{ fontSize: 11, fill: "#1f4d39" }}
          />
          <ReferenceLine
            y={impact.safePct}
            stroke="#e2842a"
            strokeDasharray="4 4"
            label={{ value: "Safe level", position: "insideBottomRight", fontSize: 11, fill: "#9a4f0c" }}
          />
          {closureHours <= 72 && (
            <ReferenceLine
              x={closureHours}
              stroke="#2b7fa8"
              strokeDasharray="4 4"
              label={{ value: "Road reopens", position: "insideTopRight", fontSize: 11, fill: "#1c5673" }}
            />
          )}
          <Line dataKey="pct" stroke={color} strokeWidth={2.5} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
