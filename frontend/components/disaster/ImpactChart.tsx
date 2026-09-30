"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import type { Scenario } from "@/lib/disaster/types";

export default function ImpactChart({ scenario, stepIndex }: { scenario: Scenario; stepIndex: number }) {
  const data = scenario.steps.map((s) => ({
    label: `${s.hour}h`,
    population: s.population.affected,
    villages: s.counts.affected,
  }));
  const current = data[stepIndex].label;

  return (
    <div className="h-[170px] w-full" aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -6 }}>
          <CartesianGrid vertical={false} stroke="rgba(248,244,234,0.12)" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#d6c8a5" }} />
          <YAxis
            yAxisId="pop"
            tickLine={false}
            axisLine={false}
            width={40}
            tick={{ fontSize: 11, fill: "#d6c8a5" }}
            tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
          />
          <YAxis
            yAxisId="vil"
            orientation="right"
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            width={28}
            tick={{ fontSize: 11, fill: "#d6c8a5" }}
          />
          <ReferenceLine yAxisId="pop" x={current} stroke="#e2842a" strokeDasharray="3 3" />
          <Bar yAxisId="pop" dataKey="population" fill="#e0523f" fillOpacity={0.8} radius={[3, 3, 0, 0]} isAnimationActive={false} />
          <Line
            yAxisId="vil"
            dataKey="villages"
            stroke="#f8f4ea"
            strokeWidth={2}
            dot={{ r: 3, fill: "#f8f4ea" }}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
