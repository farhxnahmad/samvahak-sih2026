"use client";

import { CircleMarker, Polyline, Tooltip } from "react-leaflet";
import { hubs } from "@/lib/data";
import type { MapHighlight, MapPoint } from "@/lib/copilot/types";
import { EDGES } from "@/lib/isolation/network";

export interface CopilotMapProps {
  highlight: MapHighlight | null;
}

const NODE_IDS = new Set(EDGES.flatMap((e) => [e.from, e.to]));
const RADIUS: Record<MapPoint["kind"], number> = {
  origin: 8,
  destination: 9,
  district: 8,
  depot: 7,
  incident: 6,
  village: 5,
};

export default function CopilotLayer({ highlight }: CopilotMapProps) {
  return (
    <>
      {highlight &&
        highlight.routes.map((r, i) => [
          <Polyline
            key={`c-${i}`}
            positions={r.path}
            interactive={false}
            pathOptions={{ color: "#f8f4ea", weight: r.kind === "leg" ? 7 : 10, opacity: 0.8, lineCap: "round", lineJoin: "round" }}
          />,
          <Polyline
            key={`r-${i}`}
            positions={r.path}
            pathOptions={{
              color: r.color,
              weight: r.kind === "safest" ? 6 : 4,
              opacity: 0.95,
              dashArray: r.kind === "fastest" ? "10 8" : r.kind === "leg" ? "2 8" : undefined,
              lineCap: "round",
              lineJoin: "round",
            }}
          >
            <Tooltip sticky>{r.label}</Tooltip>
          </Polyline>,
        ])}

      {hubs
        .filter((h) => NODE_IDS.has(h.id) && h.major)
        .map((h) => (
          <CircleMarker
            key={h.id}
            center={h.pos}
            radius={4.5}
            pathOptions={{ color: "#17392a", weight: 2, fillColor: "#f8f4ea", fillOpacity: 1 }}
          >
            <Tooltip permanent direction="right" offset={[8, 0]} className="hub-label">
              {h.name}
            </Tooltip>
          </CircleMarker>
        ))}

      {highlight &&
        highlight.points.map((p, i) => (
          <CircleMarker
            key={`${p.kind}-${i}`}
            center={p.pos}
            radius={RADIUS[p.kind]}
            pathOptions={{
              color: p.kind === "origin" ? "#f8f4ea" : "#10281d",
              weight: p.kind === "origin" ? 3 : 2,
              fillColor: p.color,
              fillOpacity: 1,
            }}
          >
            <Tooltip direction="top" permanent={p.permanent} offset={[0, -6]}>
              {p.label}
            </Tooltip>
          </CircleMarker>
        ))}
    </>
  );
}
