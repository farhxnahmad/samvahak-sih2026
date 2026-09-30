"use client";

import { useEffect, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  CircleMarker,
  Tooltip,
  ZoomControl,
  useMap,
} from "react-leaflet";
import RiskLayer from "./risk/RiskLayer";
import IsolationLayer, { type IsolationMapProps } from "./isolation/IsolationLayer";
import SupplyLayer, { type SupplyMapProps } from "./supply/SupplyLayer";
import DisasterLayer, { type DisasterMapProps } from "./disaster/DisasterLayer";
import CopilotLayer, { type CopilotMapProps } from "./copilot/CopilotLayer";
import { DEPOT_BY_ID } from "@/lib/supply/depots";
import { EDGE_BY_ID } from "@/lib/isolation/network";
import { VILLAGE_BY_ID } from "@/lib/isolation/villages";
import { corridors, hubs, incidents, REGION_BOUNDS } from "@/lib/data";
import { STATUS, WATERWAY_COLOR, boundsOf } from "@/lib/geo";
import type { DistrictRisk, Horizon } from "@/lib/risk/engine";
import type { Bounds, Corridor, Layers, ViewMode } from "@/lib/types";

// Space to leave clear for the floating panels when fitting the map.
function viewportPadding(): { topLeft: [number, number]; bottomRight: [number, number] } {
  if (window.innerWidth >= 1024) {
    return { topLeft: [350, 84], bottomRight: [380, 40] };
  }
  return { topLeft: [24, 120], bottomRight: [24, 300] };
}

interface MapControllerProps {
  view: ViewMode;
  corridor: Corridor | null;
  district: DistrictRisk | null;
  isolationBounds: Bounds | null;
}

function MapController({ view, corridor, district, isolationBounds }: MapControllerProps) {
  const map = useMap();

  useEffect(() => {
    const pad = viewportPadding();
    let bounds: Bounds = REGION_BOUNDS;
    let maxZoom = 8;

    if (view === "corridors" && corridor) {
      bounds = boundsOf(corridor.path);
      maxZoom = 9;
    }
    if (view === "risk" && district) {
      const [lat, lng] = district.pos;
      bounds = [
        [lat - 0.35, lng - 0.45],
        [lat + 0.35, lng + 0.45],
      ];
      maxZoom = 9;
    }

    if ((view === "isolation" || view === "supply" || view === "disaster" || view === "copilot") && isolationBounds) {
      bounds = isolationBounds;
      maxZoom = 10;
    }

    map.flyToBounds(bounds, {
      paddingTopLeft: pad.topLeft,
      paddingBottomRight: pad.bottomRight,
      maxZoom,
      duration: 1.1,
    });
  }, [view, corridor, district, isolationBounds, map]);

  return null;
}

interface MapViewProps {
  view: ViewMode;
  selectedCorridor: Corridor | null;
  hoverId: string | null;
  layers: Layers;
  onSelectCorridor: (id: string) => void;
  onHover: (id: string | null) => void;
  risks: DistrictRisk[];
  horizon: Horizon;
  selectedDistrict: DistrictRisk | null;
  onSelectDistrict: (id: string) => void;
  isolation: IsolationMapProps;
  supply: SupplyMapProps;
  disaster: DisasterMapProps;
  copilot: CopilotMapProps;
}

export default function MapView({
  view,
  selectedCorridor,
  hoverId,
  layers,
  onSelectCorridor,
  onHover,
  risks,
  horizon,
  selectedDistrict,
  onSelectDistrict,
  isolation,
  supply,
  disaster,
  copilot,
}: MapViewProps) {
  const selectedId = selectedCorridor ? selectedCorridor.id : null;
  const isRisk = view === "risk";
  const isIsolation = view === "isolation";
  const isSupply = view === "supply";
  const isDisaster = view === "disaster";
  const isCopilot = view === "copilot";
  const dim = isRisk || isCopilot;

  const isolationBounds = useMemo<Bounds | null>(() => {
    if (view === "isolation") {
      const village = isolation.focusVillageId ? VILLAGE_BY_ID[isolation.focusVillageId] : undefined;
      if (village) {
        return [
          [village.pos[0] - 0.12, village.pos[1] - 0.15],
          [village.pos[0] + 0.12, village.pos[1] + 0.15],
        ];
      }
      const edge = isolation.selectedRoadId ? EDGE_BY_ID[isolation.selectedRoadId] : undefined;
      return edge ? boundsOf(edge.path) : null;
    }
    if (view === "supply") {
      const depot = supply.depotId ? DEPOT_BY_ID[supply.depotId] : undefined;
      if (depot) {
        return [
          [depot.pos[0] - 0.4, depot.pos[1] - 0.5],
          [depot.pos[0] + 0.4, depot.pos[1] + 0.5],
        ];
      }
      const edge = supply.selectedRoadId ? EDGE_BY_ID[supply.selectedRoadId] : undefined;
      return edge ? boundsOf(edge.path) : null;
    }
    if (view === "disaster" && disaster.focus) {
      const [lat, lng] = disaster.focus.pos;
      const dLat = disaster.focus.radiusKm / 110;
      const dLng = disaster.focus.radiusKm / (111 * Math.cos((lat * Math.PI) / 180));
      return [
        [lat - dLat, lng - dLng],
        [lat + dLat, lng + dLng],
      ];
    }
    if (view === "copilot" && copilot.highlight) return copilot.highlight.bounds;
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    view,
    isolation.focusVillageId,
    isolation.selectedRoadId,
    supply.depotId,
    supply.selectedRoadId,
    disaster.focus?.pos[0],
    disaster.focus?.pos[1],
    disaster.focus?.radiusKm,
    copilot.highlight?.key,
  ]);

  const visibleCorridors = corridors.filter((c) =>
    c.mode === "waterway" ? layers.waterways : layers.roads
  );

  return (
    <MapContainer
      center={[26.0, 92.5]}
      zoom={7}
      minZoom={6}
      maxZoom={12}
      zoomControl={false}
      maxBounds={[
        [19.5, 85.0],
        [31.5, 100.0],
      ]}
      maxBoundsViscosity={0.8}
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ZoomControl position="bottomright" />
      <MapController
        view={view}
        corridor={selectedCorridor}
        district={selectedDistrict}
        isolationBounds={isolationBounds}
      />

      {isIsolation && <IsolationLayer {...isolation} />}
      {isSupply && <SupplyLayer {...supply} />}
      {isDisaster && <DisasterLayer {...disaster} />}
      {isCopilot && <CopilotLayer {...copilot} />}

      {isRisk && (
        <RiskLayer
          risks={risks}
          horizon={horizon}
          selectedId={selectedDistrict ? selectedDistrict.id : null}
          onSelect={onSelectDistrict}
        />
      )}

      {(isIsolation || isSupply || isDisaster ? [] : visibleCorridors).map((c) => {
        const isSelected = !dim && c.id === selectedId;
        const isHover = !dim && c.id === hoverId;
        const isWater = c.mode === "waterway";
        const color = isWater ? WATERWAY_COLOR : STATUS[c.status].color;
        const dimmed = dim || (selectedId !== null && !isSelected);

        return [
          isSelected && (
            <Polyline
              key={`${c.id}-glow`}
              positions={c.path}
              interactive={false}
              pathOptions={{
                color: "#f8f4ea",
                weight: 11,
                opacity: 0.85,
                lineCap: "round",
                lineJoin: "round",
              }}
            />
          ),
          <Polyline
            key={c.id}
            positions={c.path}
            interactive={false}
            pathOptions={{
              color,
              weight: dim ? 2.5 : isSelected || isHover ? 5 : 3.5,
              opacity: dim ? 0.4 : dimmed ? 0.4 : 0.95,
              dashArray: isWater ? "1 9" : undefined,
              lineCap: "round",
              lineJoin: "round",
            }}
          />,
          !dim && (
            <Polyline
              key={`${c.id}-hit`}
              positions={c.path}
              pathOptions={{ color, weight: 18, opacity: 0 }}
              eventHandlers={{
                click: () => onSelectCorridor(c.id),
                mouseover: () => onHover(c.id),
                mouseout: () => onHover(null),
              }}
            >
              <Tooltip sticky>{c.name}</Tooltip>
            </Polyline>
          ),
        ];
      })}

      {view === "corridors" &&
        layers.hubs &&
        hubs.map((h) => (
          <CircleMarker
            key={h.id}
            center={h.pos}
            radius={h.major ? 6 : 4}
            pathOptions={{
              color: "#17392a",
              weight: 2,
              fillColor: "#f8f4ea",
              fillOpacity: 1,
            }}
          >
            {h.major ? (
              <Tooltip permanent direction="right" offset={[8, 0]} className="hub-label">
                {h.name}
              </Tooltip>
            ) : (
              <Tooltip direction="top">{`${h.name}, ${h.state}`}</Tooltip>
            )}
          </CircleMarker>
        ))}

      {view === "corridors" &&
        layers.incidents &&
        incidents.map((i) => [
          <CircleMarker
            key={`${i.id}-halo`}
            center={i.pos}
            radius={13}
            interactive={false}
            pathOptions={{ stroke: false, fillColor: "#b0432f", fillOpacity: 0.2 }}
          />,
          <CircleMarker
            key={i.id}
            center={i.pos}
            radius={5.5}
            pathOptions={{ color: "#f8f4ea", weight: 2, fillColor: "#b0432f", fillOpacity: 1 }}
            eventHandlers={{ click: () => onSelectCorridor(i.corridorId) }}
          >
            <Tooltip direction="top">{`${i.type}: ${i.title}`}</Tooltip>
          </CircleMarker>,
        ])}
    </MapContainer>
  );
}
