"use client";

import { Circle, CircleMarker, Pane, Tooltip } from "react-leaflet";
import { scoreAt, type DistrictRisk, type Horizon } from "@/lib/risk/engine";
import { CATEGORY, categoryOf, scoreColor } from "@/lib/risk/model";

interface RiskLayerProps {
  risks: DistrictRisk[];
  horizon: Horizon;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function RiskLayer({ risks, horizon, selectedId, onSelect }: RiskLayerProps) {
  return (
    <>
      {/* Heatmap: one soft blob per district, blurred together by CSS on the pane */}
      <Pane name="risk-heat" style={{ zIndex: 380 }} className="risk-heat-pane">
        {risks.map((d) => {
          const score = scoreAt(d, horizon);
          return (
            <Circle
              key={d.id}
              center={d.pos}
              radius={22000 + score * 160}
              interactive={false}
              pathOptions={{ stroke: false, fillColor: scoreColor(score), fillOpacity: 0.55 }}
            />
          );
        })}
      </Pane>

      {/* Crisp district markers on top, coloured by risk category */}
      <Pane name="risk-points" style={{ zIndex: 610 }}>
        {risks.map((d) => {
          const score = scoreAt(d, horizon);
          const category = categoryOf(score);
          const selected = d.id === selectedId;
          return (
            <CircleMarker
              key={d.id}
              center={d.pos}
              radius={selected ? 10 : 6}
              pathOptions={{
                color: selected ? "#10281d" : "#f8f4ea",
                weight: selected ? 3 : 2,
                fillColor: CATEGORY[category].color,
                fillOpacity: 1,
              }}
              eventHandlers={{ click: () => onSelect(d.id) }}
            >
              <Tooltip direction="top">{`${d.name}: ${score} (${CATEGORY[category].label})`}</Tooltip>
            </CircleMarker>
          );
        })}
      </Pane>
    </>
  );
}
