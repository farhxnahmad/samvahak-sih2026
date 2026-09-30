"use client";

import type { LeafletMouseEvent } from "leaflet";
import { CircleMarker, Polyline, Tooltip } from "react-leaflet";
import { fmt } from "@/lib/format";
import { EDGES, EDGE_BY_ID } from "@/lib/isolation/network";
import { BLOCKED_COLOR, ROUTE_B_COLOR } from "@/lib/isolation/style";
import { DEPOTS } from "@/lib/supply/depots";
import { GOOD_BY_ID, type GoodId } from "@/lib/supply/goods";
import { ROUTE_USAGE, impactOf, type SupplyAnalysis } from "@/lib/supply/model";
import { SUPPLY_RISK_STYLE } from "@/lib/supply/style";

export interface SupplyMapProps {
  selectedRoadId: string | null;
  analysis: SupplyAnalysis | null;
  goodId: GoodId;
  depotId: string | null;
  onRoadClick: (edgeId: string) => void;
  onDepotClick: (id: string) => void;
}

export default function SupplyLayer({
  selectedRoadId,
  analysis,
  goodId,
  depotId,
  onRoadClick,
  onDepotClick,
}: SupplyMapProps) {
  const good = GOOD_BY_ID[goodId];
  const usage = ROUTE_USAGE[goodId];
  const blockedEdge = analysis ? EDGE_BY_ID[analysis.edgeId] : null;
  const focus = analysis && depotId ? impactOf(analysis, goodId, depotId) : undefined;
  const altEdges = focus && focus.chosen ? focus.chosen.edgeIds : [];

  return (
    <>
      {EDGES.map((edge) => {
        const count = usage[edge.id] ?? 0;
        const selected = edge.id === selectedRoadId;
        return [
          selected && (
            <Polyline
              key={`${edge.id}-glow`}
              positions={edge.path}
              interactive={false}
              pathOptions={{ color: "#f8f4ea", weight: 13, opacity: 0.85, lineCap: "round", lineJoin: "round" }}
            />
          ),
          <Polyline
            key={edge.id}
            positions={edge.path}
            interactive={false}
            pathOptions={{
              color: count > 0 ? good.color : "#1f4d39",
              weight: count > 0 ? 3 + Math.min(count, 6) * 0.9 : 2.5,
              opacity: count > 0 ? 0.85 : 0.35,
              lineCap: "round",
              lineJoin: "round",
            }}
          />,
          <Polyline
            key={`${edge.id}-hit`}
            positions={edge.path}
            pathOptions={{ color: "#1f4d39", weight: 18, opacity: 0 }}
            eventHandlers={{ click: (_e: LeafletMouseEvent) => onRoadClick(edge.id) }}
          >
            <Tooltip sticky>
              {`${edge.name}: feeds ${count} ${count === 1 ? "depot" : "depots"} with ${good.label.toLowerCase()}`}
            </Tooltip>
          </Polyline>,
        ];
      })}

      {altEdges.map((id) => (
        <Polyline
          key={`alt-${id}`}
          positions={EDGE_BY_ID[id].path}
          interactive={false}
          pathOptions={{ color: ROUTE_B_COLOR, weight: 6, opacity: 0.85, lineCap: "round", lineJoin: "round" }}
        />
      ))}

      {blockedEdge && (
        <Polyline
          positions={blockedEdge.path}
          interactive={false}
          pathOptions={{ color: BLOCKED_COLOR, weight: 8, opacity: 0.95, dashArray: "10 8", lineCap: "butt" }}
        />
      )}

      {DEPOTS.map((depot) => {
        const impact = analysis ? impactOf(analysis, goodId, depot.id) : undefined;
        const isSource = good.sources.includes(depot.id);
        const radius = 5 + Math.sqrt(depot.people) / 300;
        let fill = "#f8f4ea";
        if (analysis) {
          fill = impact && impact.affected ? SUPPLY_RISK_STYLE[impact.risk].color : "#a89670";
        }
        const detail = impact && impact.affected
          ? `${impact.risk} risk${impact.hoursToThreshold !== null ? `, below safe level in ${impact.hoursToThreshold} h` : ""}`
          : `${depot.cover[goodId]} days of cover`;
        return [
          isSource && (
            <CircleMarker
              key={`${depot.id}-source`}
              center={depot.pos}
              radius={radius + 6}
              interactive={false}
              pathOptions={{ color: good.color, weight: 3, fillOpacity: 0 }}
            />
          ),
          depot.id === depotId && (
            <CircleMarker
              key={`${depot.id}-focus`}
              center={depot.pos}
              radius={radius + 4}
              interactive={false}
              pathOptions={{ color: "#10281d", weight: 2, fillOpacity: 0 }}
            />
          ),
          <CircleMarker
            key={depot.id}
            center={depot.pos}
            radius={radius}
            pathOptions={{ color: "#17392a", weight: 2, fillColor: fill, fillOpacity: 1 }}
            eventHandlers={{ click: () => onDepotClick(depot.id) }}
          >
            <Tooltip direction="top">
              {`${depot.name}${isSource ? " (source hub)" : ""}: ${fmt(depot.people)} people, ${detail}`}
            </Tooltip>
          </CircleMarker>,
        ];
      })}
    </>
  );
}
