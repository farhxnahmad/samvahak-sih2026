"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { horizonLabel, type DistrictRisk } from "@/lib/risk/engine";

interface ChartPoint {
  label: string;
  score: number;
  range: [number, number];
}

export default function ForecastChart({ district }: { district: DistrictRisk }) {
  const data: ChartPoint[] = district.forecast.map((p) => ({
    label: horizonLabel(p.horizon),
    score: p.score,
    range: [p.low, p.high],
  }));

  return (
    <div className="h-[168px] w-full" aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <CartesianGrid vertical={false} stroke="rgba(23,57,42,0.10)" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: "#1f4d39" }}
          />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 30, 60, 80, 100]}
            tickLine={false}
            axisLine={false}
            width={40}
            tick={{ fontSize: 11, fill: "#1f4d39" }}
          />
          <ReferenceLine y={60} stroke="#e2842a" strokeDasharray="3 4" strokeOpacity={0.6} />
          <ReferenceLine y={80} stroke="#c0392b" strokeDasharray="3 4" strokeOpacity={0.6} />
          <Area
            dataKey="range"
            stroke="none"
            fill="#2b7fa8"
            fillOpacity={0.16}
            isAnimationActive={false}
          />
          <Line
            dataKey="score"
            stroke="#17392a"
            strokeWidth={2.5}
            dot={{ r: 4, fill: "#17392a", stroke: "#f8f4ea", strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
