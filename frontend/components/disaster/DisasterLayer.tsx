"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { divIcon } from "leaflet";
import { animate } from "framer-motion";
import { Circle, CircleMarker, Marker, Pane, Polyline, Tooltip } from "react-leaflet";
import { hubs } from "@/lib/data";
import { fmt } from "@/lib/format";
import { TYPE_INFO } from "@/lib/disaster/meta";
import type { Scenario, StepResult } from "@/lib/disaster/types";
import { slicePath } from "@/lib/isolation/geometry";
import { EDGES, EDGE_BY_ID } from "@/lib/isolation/network";
import { BLOCKED_COLOR, VILLAGE_STYLE } from "@/lib/isolation/style";
import type { VillageState } from "@/lib/isolation/types";
import { VILLAGES } from "@/lib/isolation/villages";
import { DISTRICT_RISKS } from "@/lib/risk/engine";
import { CATEGORY, categoryOf, scoreColor } from "@/lib/risk/model";
import type { LatLng } from "@/lib/types";

export interface DisasterMapProps {
  scenario: Scenario | null;
  step: StepResult | null;
  previewPos: LatLng | null;
  focus: { pos: LatLng; radiusKm: number } | null;
}

const RANK: Record<VillageState, number> = { other: 0, connected: 1, "at-risk": 2, isolated: 3 };
const NODE_IDS = new Set(EDGES.flatMap((e) => [e.from, e.to]));
const PULSE = divIcon({ className: "eoc-pulse", html: "<span></span>", iconSize: [14, 14], iconAnchor: [7, 7] });

export default function DisasterLayer({ scenario, step, previewPos }: DisasterMapProps) {
  // Ease the hazard zone between replay steps so it visibly expands.
  const [radius, setRadius] = useState(0);
  const radiusRef = useRef(0);
  const target = step ? step.radiusKm : 0;

  useEffect(() => {
    const controls = animate(radiusRef.current, target, {
      duration: 1.2,
      ease: "easeOut",
      onUpdate: (value: number) => {
        radiusRef.current = value;
        setRadius(value);
      },
    });
    return () => controls.stop();
  }, [target]);

  const villages = useMemo(
    () =>
      [...VILLAGES].sort((a, b) => {
        const sa = step ? step.villages[a.id].state : "other";
        const sb = step ? step.villages[b.id].state : "other";
        return RANK[sa] - RANK[sb];
      }),
    [step]
  );

  const info = scenario ? TYPE_INFO[scenario.config.type] : null;

  return (
    <>
      {scenario && step && info && (
        <>
          <Pane name="dz-heat" style={{ zIndex: 370 }} className="risk-heat-pane">
            {DISTRICT_RISKS.map((d) => {
              const score = step.districts[d.id].score;
              return (
                <Circle
                  key={d.id}
                  center={d.pos}
                  radius={20000 + score * 150}
                  interactive={false}
                  pathOptions={{ stroke: false, fillColor: scoreColor(score), fillOpacity: 0.5 }}
                />
              );
            })}
          </Pane>

          <Circle
            center={scenario.epicentre}
            radius={radius * 1000}
            interactive={false}
            pathOptions={{ color: info.color, weight: 1.5, dashArray: "6 6", fillColor: info.color, fillOpacity: 0.13 }}
          />
          {info.blockShare > 0 && (
            <Circle
              center={scenario.epicentre}
              radius={radius * info.blockShare * 1000}
              interactive={false}
              pathOptions={{ color: BLOCKED_COLOR, weight: 1, fillColor: BLOCKED_COLOR, fillOpacity: 0.16 }}
            />
          )}
        </>
      )}

      {EDGES.map((edge) => {
        const state = step ? step.roads[edge.id] : undefined;
        const condition = state ? state.condition : "open";
        const stretch =
          state && state.condition === "blocked"
            ? slicePath(edge.path, state.stretch.startKm / edge.lengthKm, state.stretch.endKm / edge.lengthKm)
            : null;
        return [
          <Polyline
            key={edge.id}
            positions={edge.path}
            interactive={false}
            pathOptions={{
              color: condition === "degraded" ? "#d1861f" : "#1f4d39",
              weight: condition === "degraded" ? 4.5 : 3,
              opacity: condition === "open" ? 0.6 : 0.95,
              dashArray: condition === "degraded" ? "6 6" : undefined,
              lineCap: "round",
              lineJoin: "round",
            }}
          >
            <Tooltip sticky>{`${edge.name}: ${condition}`}</Tooltip>
          </Polyline>,
          stretch && (
            <Polyline
              key={`${edge.id}-blocked`}
              positions={stretch}
              interactive={false}
              pathOptions={{ color: BLOCKED_COLOR, weight: 8, opacity: 0.95, dashArray: "10 8", lineCap: "butt" }}
            />
          ),
        ];
      })}

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

      {villages.map((v) => {
        const impact = step ? step.villages[v.id] : null;
        const state: VillageState = impact ? impact.state : "other";
        const style = VILLAGE_STYLE[state];
        const r = 3 + Math.sqrt(v.population) / 26;
        return [
          state === "isolated" && (
            <CircleMarker
              key={`${v.id}-halo`}
              center={v.pos}
              radius={r + 8}
              interactive={false}
              pathOptions={{ stroke: false, fillColor: style.color, fillOpacity: 0.22 }}
            />
          ),
          <CircleMarker
            key={v.id}
            center={v.pos}
            radius={r}
            pathOptions={{
              color: "#f8f4ea",
              weight: 1.5,
              fillColor: style.color,
              fillOpacity: state === "other" ? 0.7 : 1,
            }}
          >
            <Tooltip direction="top">
              {`${v.name}, ${fmt(v.population)} people${impact && state !== "other" ? `: ${style.label}. ${impact.reason}` : ""}`}
            </Tooltip>
          </CircleMarker>,
        ];
      })}

      {step &&
        DISTRICT_RISKS.map((d) => {
          const s = step.districts[d.id];
          const cat = categoryOf(s.score);
          if (s.delta < 3) return null;
          return (
            <CircleMarker
              key={`dz-${d.id}`}
              center={d.pos}
              radius={5}
              pathOptions={{ color: "#10281d", weight: 2, fillColor: CATEGORY[cat].color, fillOpacity: 1 }}
            >
              <Tooltip direction="top">{`${d.name}: accessibility risk ${s.score} (+${s.delta}), ${CATEGORY[cat].label}`}</Tooltip>
            </CircleMarker>
          );
        })}

      {scenario ? (
        <Marker position={scenario.epicentre} icon={PULSE} interactive={false} />
      ) : (
        previewPos && (
          <CircleMarker
            center={previewPos}
            radius={12}
            interactive={false}
            pathOptions={{ color: "#b0432f", weight: 2, dashArray: "4 4", fillOpacity: 0 }}
          />
        )
      )}
    </>
  );
}
