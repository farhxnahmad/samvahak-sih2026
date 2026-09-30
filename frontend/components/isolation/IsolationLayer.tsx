"use client";

import type { LeafletMouseEvent } from "leaflet";
import { CircleMarker, Polyline, Tooltip } from "react-leaflet";
import { hubs } from "@/lib/data";
import { fmt } from "@/lib/format";
import { fractionAlong, slicePath } from "@/lib/isolation/geometry";
import { EDGES, EDGE_BY_ID, FACILITIES } from "@/lib/isolation/network";
import { BLOCKED_COLOR, ROUTE_B_COLOR, VILLAGE_STYLE } from "@/lib/isolation/style";
import type { Blockage, SimulationResult, VillageState } from "@/lib/isolation/types";
import { VILLAGES } from "@/lib/isolation/villages";
import type { LatLng } from "@/lib/types";

export interface IsolationMapProps {
  selectedRoadId: string | null;
  blockage: Blockage | null;
  result: SimulationResult | null;
  dependentIds: ReadonlySet<string>;
  focusVillageId: string | null;
  onRoadClick: (edgeId: string, fraction: number) => void;
  onVillageClick: (id: string) => void;
}

const RANK: Record<VillageState, number> = { other: 0, connected: 1, "at-risk": 2, isolated: 3 };
const NODE_IDS = new Set(EDGES.flatMap((e) => [e.from, e.to]));

export default function IsolationLayer({
  selectedRoadId,
  blockage,
  result,
  dependentIds,
  focusVillageId,
  onRoadClick,
  onVillageClick,
}: IsolationMapProps) {
  const stateOf = (id: string): VillageState => {
    if (result) return result.byId[id]?.state ?? "other";
    return dependentIds.has(id) ? "connected" : "other";
  };

  const villages = [...VILLAGES].sort((a, b) => RANK[stateOf(a.id)] - RANK[stateOf(b.id)]);

  const zoneEdge = blockage ? EDGE_BY_ID[blockage.edgeId] : null;
  const zonePath: LatLng[] =
    blockage && zoneEdge
      ? slicePath(zoneEdge.path, blockage.startKm / zoneEdge.lengthKm, blockage.endKm / zoneEdge.lengthKm)
      : [];

  const routeBEdges = result && result.detour ? result.detour.edgeIds : [];

  return (
    <>
      {EDGES.map((edge) => {
        const selected = edge.id === selectedRoadId;
        return [
          selected && (
            <Polyline
              key={`${edge.id}-glow`}
              positions={edge.path}
              interactive={false}
              pathOptions={{ color: "#f8f4ea", weight: 11, opacity: 0.85, lineCap: "round", lineJoin: "round" }}
            />
          ),
          <Polyline
            key={edge.id}
            positions={edge.path}
            interactive={false}
            pathOptions={{
              color: selected ? "#10281d" : "#1f4d39",
              weight: selected ? 5 : 3,
              opacity: selected ? 1 : selectedRoadId ? 0.35 : 0.6,
              lineCap: "round",
              lineJoin: "round",
            }}
          />,
          <Polyline
            key={`${edge.id}-hit`}
            positions={edge.path}
            pathOptions={{ color: "#1f4d39", weight: 18, opacity: 0 }}
            eventHandlers={{
              click: (e: LeafletMouseEvent) =>
                onRoadClick(edge.id, fractionAlong([e.latlng.lat, e.latlng.lng], edge.path)),
            }}
          >
            <Tooltip sticky>{`${edge.name}, ${edge.lengthKm} km`}</Tooltip>
          </Polyline>,
        ];
      })}

      {routeBEdges.map((id) => (
        <Polyline
          key={`route-b-${id}`}
          positions={EDGE_BY_ID[id].path}
          interactive={false}
          pathOptions={{ color: ROUTE_B_COLOR, weight: 6, opacity: 0.85, lineCap: "round", lineJoin: "round" }}
        />
      ))}

      {blockage && zonePath.length > 1 && (
        <>
          <Polyline
            positions={zonePath}
            interactive={false}
            pathOptions={{ color: BLOCKED_COLOR, weight: 8, opacity: 0.95, dashArray: "10 8", lineCap: "butt" }}
          />
          <CircleMarker
            center={zonePath[0]}
            radius={5}
            pathOptions={{ color: "#f8f4ea", weight: 2, fillColor: BLOCKED_COLOR, fillOpacity: 1 }}
          >
            <Tooltip direction="top">Blockage starts here</Tooltip>
          </CircleMarker>
          <CircleMarker
            center={zonePath[zonePath.length - 1]}
            radius={5}
            pathOptions={{ color: "#f8f4ea", weight: 2, fillColor: BLOCKED_COLOR, fillOpacity: 1 }}
          >
            <Tooltip direction="top">Blockage ends here</Tooltip>
          </CircleMarker>
        </>
      )}

      {hubs
        .filter((h) => NODE_IDS.has(h.id))
        .map((h) => (
          <CircleMarker
            key={h.id}
            center={h.pos}
            radius={h.major ? 5 : 3.5}
            pathOptions={{ color: "#17392a", weight: 2, fillColor: "#f8f4ea", fillOpacity: 1 }}
          >
            {h.major ? (
              <Tooltip permanent direction="right" offset={[8, 0]} className="hub-label">
                {h.name}
              </Tooltip>
            ) : (
              <Tooltip direction="top">{h.name}</Tooltip>
            )}
          </CircleMarker>
        ))}

      {FACILITIES.map((f) => {
        const isHealth = f.kind === "healthcare";
        const center: LatLng = isHealth ? [f.pos[0] + 0.05, f.pos[1] - 0.05] : [f.pos[0] - 0.05, f.pos[1] + 0.05];
        return (
          <CircleMarker
            key={f.id}
            center={center}
            radius={isHealth ? 5.5 : 4.5}
            pathOptions={{
              color: isHealth ? "#1c5673" : "#6b5d3f",
              weight: isHealth ? 3 : 2,
              fillColor: isHealth ? "#f8f4ea" : "#d6c8a5",
              fillOpacity: 1,
            }}
          >
            <Tooltip direction="top">{f.name}</Tooltip>
          </CircleMarker>
        );
      })}

      {villages.map((v) => {
        const state = stateOf(v.id);
        const style = VILLAGE_STYLE[state];
        const radius = 3.5 + Math.sqrt(v.population) / 22;
        const impact = result ? result.byId[v.id] : null;
        return [
          state === "isolated" && (
            <CircleMarker
              key={`${v.id}-halo`}
              center={v.pos}
              radius={radius + 8}
              interactive={false}
              pathOptions={{ stroke: false, fillColor: style.color, fillOpacity: 0.22 }}
            />
          ),
          v.id === focusVillageId && (
            <CircleMarker
              key={`${v.id}-focus`}
              center={v.pos}
              radius={radius + 5}
              interactive={false}
              pathOptions={{ color: "#10281d", weight: 2, fillOpacity: 0 }}
            />
          ),
          <CircleMarker
            key={v.id}
            center={v.pos}
            radius={radius}
            pathOptions={{
              color: "#f8f4ea",
              weight: 1.5,
              fillColor: style.color,
              fillOpacity: state === "other" ? 0.75 : 1,
            }}
            eventHandlers={{ click: () => onVillageClick(v.id) }}
          >
            <Tooltip direction="top">
              {`${v.name}, ${fmt(v.population)} people${impact ? ` (${style.label})` : ""}`}
            </Tooltip>
          </CircleMarker>,
        ];
      })}
    </>
  );
}
