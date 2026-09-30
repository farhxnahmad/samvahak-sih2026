"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, MotionConfig } from "framer-motion";
import Header from "./Header";
import CorridorList from "./CorridorList";
import CorridorDetail from "./CorridorDetail";
import LayerBar from "./LayerBar";
import MobileTray from "./MobileTray";
import RiskList from "./risk/RiskList";
import RiskTray from "./risk/RiskTray";
import DistrictDetail from "./risk/DistrictDetail";
import RegionOverview from "./risk/RegionOverview";
import HorizonBar from "./risk/HorizonBar";
import RoadList from "./isolation/RoadList";
import IsolationTray from "./isolation/IsolationTray";
import IsolationPanel from "./isolation/IsolationPanel";
import IsolationIntro from "./isolation/IsolationIntro";
import IsolationLegend from "./isolation/IsolationLegend";
import RouteList from "./supply/RouteList";
import SupplyTray from "./supply/SupplyTray";
import SupplyPanel from "./supply/SupplyPanel";
import SupplyIntro from "./supply/SupplyIntro";
import GoodsBar from "./supply/GoodsBar";
import DisasterView from "./disaster/DisasterView";
import CopilotView from "./copilot/CopilotView";
import { useCopilot } from "@/lib/copilot/useCopilot";
import { useAuth } from "@/lib/auth/useAuth";
import LoginScreen from "./auth/LoginScreen";
import { TYPE_INFO } from "@/lib/disaster/meta";
import { useScenario } from "@/lib/disaster/useScenario";
import { corridors, incidents } from "@/lib/data";
import { DISTRICT_RISKS, scoreAt, type Horizon } from "@/lib/risk/engine";
import { categoryOf, type RiskCategory } from "@/lib/risk/model";
import { EDGE_BY_ID } from "@/lib/isolation/network";
import { recommendations } from "@/lib/isolation/recommend";
import { simulate } from "@/lib/isolation/simulate";
import type { Blockage } from "@/lib/isolation/types";
import { DEPENDENTS, VILLAGES } from "@/lib/isolation/villages";
import { DEPOTS } from "@/lib/supply/depots";
import type { GoodId } from "@/lib/supply/goods";
import { LINES, analyse } from "@/lib/supply/model";
import { recommendations as supplyRecommendations } from "@/lib/supply/recommend";
import type { CorridorStatus, Layers, ViewMode } from "@/lib/types";

// Leaflet needs the browser, so the map is loaded on the client only.
const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-sand-200" />,
});

const NO_VILLAGES: ReadonlySet<string> = new Set<string>();
const TOTAL_PEOPLE = VILLAGES.reduce((sum, v) => sum + v.population, 0);

function defaultBlockLen(lengthKm: number): number {
  const wanted = Math.round((lengthKm * 0.3) / 5) * 5;
  return Math.min(Math.floor(lengthKm), Math.min(80, Math.max(10, wanted)));
}

export default function CommandCenter() {
  const auth = useAuth();
  const [view, setView] = useState<ViewMode>("corridors");
  const [selectedCorridorId, setSelectedCorridorId] = useState<string | null>(null);
  const [selectedDistrictId, setSelectedDistrictId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [horizon, setHorizon] = useState<Horizon>(0);
  const [layers, setLayers] = useState<Layers>({
    roads: true,
    waterways: true,
    hubs: true,
    incidents: true,
  });

  const [roadId, setRoadId] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [blockPct, setBlockPct] = useState(0.5);
  const [blockLen, setBlockLen] = useState(20);
  const [focusVillageId, setFocusVillageId] = useState<string | null>(null);

  const [supplyRoadId, setSupplyRoadId] = useState<string | null>(null);
  const [supplySim, setSupplySim] = useState(false);
  const [closureHours, setClosureHours] = useState(72);
  const [goodId, setGoodId] = useState<GoodId>("medicine");
  const [depotId, setDepotId] = useState<string | null>(null);

  const sim = useScenario();
  const copilot = useCopilot();
  const disasterFocus = useMemo(() => {
    if (sim.scenario) return { pos: sim.scenario.epicentre, radiusKm: sim.scenario.finalRadiusKm };
    if (sim.districtPreview) {
      const info = TYPE_INFO[sim.config.type];
      return { pos: sim.districtPreview.pos, radiusKm: info.radiusKm[sim.config.severity - 1] };
    }
    return null;
  }, [sim.scenario, sim.districtPreview, sim.config.type, sim.config.severity]);

  const selectedCorridor = useMemo(
    () => corridors.find((c) => c.id === selectedCorridorId) ?? null,
    [selectedCorridorId]
  );
  const selectedDistrict = useMemo(
    () => DISTRICT_RISKS.find((d) => d.id === selectedDistrictId) ?? null,
    [selectedDistrictId]
  );

  const corridorCounts = useMemo(() => {
    const result: Record<CorridorStatus, number> = { clear: 0, caution: 0, disrupted: 0 };
    corridors.forEach((c) => {
      result[c.status] += 1;
    });
    return result;
  }, []);

  const riskCounts = useMemo(() => {
    const result: Record<RiskCategory, number> = { low: 0, moderate: 0, high: 0, critical: 0 };
    DISTRICT_RISKS.forEach((d) => {
      result[categoryOf(scoreAt(d, horizon))] += 1;
    });
    return result;
  }, [horizon]);

  const roadEdge = roadId ? EDGE_BY_ID[roadId] ?? null : null;
  const dependentIds = roadId ? DEPENDENTS[roadId] ?? NO_VILLAGES : NO_VILLAGES;

  const blockage = useMemo<Blockage | null>(() => {
    if (!roadEdge || !simulating) return null;
    const center = blockPct * roadEdge.lengthKm;
    return {
      edgeId: roadEdge.id,
      startKm: Math.max(0, center - blockLen / 2),
      endKm: Math.min(roadEdge.lengthKm, center + blockLen / 2),
    };
  }, [roadEdge, simulating, blockPct, blockLen]);

  const result = useMemo(() => (blockage ? simulate(blockage) : null), [blockage]);
  const advice = useMemo(() => (result ? recommendations(result) : []), [result]);

  const supplyEdge = supplyRoadId ? EDGE_BY_ID[supplyRoadId] ?? null : null;
  const analysis = useMemo(
    () => (supplyRoadId && supplySim ? analyse(supplyRoadId, closureHours) : null),
    [supplyRoadId, supplySim, closureHours]
  );
  const supplyAdvice = useMemo(() => (analysis ? supplyRecommendations(analysis) : []), [analysis]);

  const selectSupplyRoad = (id: string) => {
    if (!EDGE_BY_ID[id]) return;
    setSupplyRoadId(id);
    setSupplySim(false);
    setClosureHours(72);
    setDepotId(null);
  };

  const closeSupplyRoad = () => {
    setSupplyRoadId(null);
    setSupplySim(false);
    setDepotId(null);
  };

  const selectRoad = (id: string) => {
    const edge = EDGE_BY_ID[id];
    if (!edge) return;
    setRoadId(id);
    setSimulating(false);
    setBlockPct(0.5);
    setBlockLen(defaultBlockLen(edge.lengthKm));
    setFocusVillageId(null);
  };

  const onRoadClick = (edgeId: string, fraction: number) => {
    if (edgeId === roadId && simulating) {
      setBlockPct(fraction);
    } else {
      selectRoad(edgeId);
    }
  };

  const closeRoad = () => {
    setRoadId(null);
    setSimulating(false);
    setFocusVillageId(null);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedCorridorId(null);
        setSelectedDistrictId(null);
        setRoadId(null);
        setSimulating(false);
        setFocusVillageId(null);
        setSupplyRoadId(null);
        setSupplySim(false);
        setDepotId(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const toggleLayer = (key: keyof Layers) =>
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));

  if (auth.mode === "checking") {
    return <main className="flex h-dvh w-full items-center justify-center bg-sand-200" aria-busy="true" />;
  }
  if (auth.mode === "login") {
    return <LoginScreen auth={auth} />;
  }

  return (
    <MotionConfig reducedMotion="user">
      <main className="relative h-dvh w-full overflow-hidden bg-sand-200">
        <div className="absolute inset-0 isolate z-0">
          <MapView
            view={view}
            selectedCorridor={selectedCorridor}
            hoverId={hoverId}
            layers={layers}
            onSelectCorridor={setSelectedCorridorId}
            onHover={setHoverId}
            risks={DISTRICT_RISKS}
            horizon={horizon}
            selectedDistrict={selectedDistrict}
            onSelectDistrict={setSelectedDistrictId}
            isolation={{
              selectedRoadId: roadId,
              blockage,
              result,
              dependentIds,
              focusVillageId,
              onRoadClick,
              onVillageClick: setFocusVillageId,
            }}
            supply={{
              selectedRoadId: supplyRoadId,
              analysis,
              goodId,
              depotId,
              onRoadClick: selectSupplyRoad,
              onDepotClick: setDepotId,
            }}
            disaster={{
              scenario: sim.scenario,
              step: sim.step,
              previewPos: sim.districtPreview ? sim.districtPreview.pos : null,
              focus: disasterFocus,
            }}
            copilot={{ highlight: copilot.active ? copilot.active.map : null }}
          />
        </div>

        <Header
          view={view}
          onViewChange={setView}
          corridorCounts={corridorCounts}
          incidentCount={incidents.length}
          riskCounts={riskCounts}
          horizon={horizon}
          isolationSummary={{
            villages: VILLAGES.length,
            people: TOTAL_PEOPLE,
            affected: result ? result.affectedCount : null,
          }}
          supplySummary={{
            depots: DEPOTS.length,
            routes: LINES.filter((l) => !l.self).length,
            overall: analysis ? analysis.overallRisk : null,
          }}
          disasterSummary={{
            active: sim.step !== null,
            hour: sim.step ? sim.step.hour : 0,
            blocked: sim.step ? sim.step.blockedEdgeIds.length : 0,
            degraded: sim.step ? sim.step.degradedEdgeIds.length : 0,
            villages: sim.step ? sim.step.counts.affected : 0,
          }}
          copilotSummary={{
            queries: copilot.log.length,
            level: copilot.active ? copilot.active.assessment.level : null,
          }}
          auth={auth}
        />

        {view === "corridors" && (
          <>
            <CorridorList
              corridors={corridors}
              selectedId={selectedCorridorId}
              onSelect={setSelectedCorridorId}
              onHover={setHoverId}
            />
            <LayerBar layers={layers} onToggle={toggleLayer} />
            <AnimatePresence mode="wait">
              {selectedCorridor ? (
                <CorridorDetail
                  key={selectedCorridor.id}
                  corridor={selectedCorridor}
                  onClose={() => setSelectedCorridorId(null)}
                />
              ) : null}
            </AnimatePresence>
            {!selectedCorridor && (
              <MobileTray corridors={corridors} onSelect={setSelectedCorridorId} />
            )}
          </>
        )}

        {view === "risk" && (
          <>
            <RiskList
              risks={DISTRICT_RISKS}
              horizon={horizon}
              selectedId={selectedDistrictId}
              onSelect={setSelectedDistrictId}
            />
            <HorizonBar horizon={horizon} onChange={setHorizon} />
            <AnimatePresence mode="wait">
              {selectedDistrict ? (
                <DistrictDetail
                  key={selectedDistrict.id}
                  district={selectedDistrict}
                  horizon={horizon}
                  onHorizon={setHorizon}
                  onClose={() => setSelectedDistrictId(null)}
                />
              ) : null}
            </AnimatePresence>
            {!selectedDistrict && (
              <>
                <RegionOverview risks={DISTRICT_RISKS} horizon={horizon} />
                <RiskTray
                  risks={DISTRICT_RISKS}
                  horizon={horizon}
                  onSelect={setSelectedDistrictId}
                />
              </>
            )}
          </>
        )}

        {view === "isolation" && (
          <>
            <RoadList selectedId={roadId} onSelect={selectRoad} />
            <IsolationLegend />
            <AnimatePresence mode="wait">
              {roadEdge ? (
                <IsolationPanel
                  key={roadEdge.id}
                  edge={roadEdge}
                  dependentIds={dependentIds}
                  simulating={simulating}
                  onSimulate={() => setSimulating(true)}
                  onStop={() => setSimulating(false)}
                  onClose={closeRoad}
                  blockPct={blockPct}
                  blockLen={blockLen}
                  onBlockPct={setBlockPct}
                  onBlockLen={setBlockLen}
                  result={result}
                  recommendations={advice}
                  focusVillageId={focusVillageId}
                  onFocusVillage={setFocusVillageId}
                />
              ) : null}
            </AnimatePresence>
            {!roadEdge && (
              <>
                <IsolationIntro />
                <IsolationTray onSelect={selectRoad} />
              </>
            )}
          </>
        )}

        {view === "supply" && (
          <>
            <RouteList selectedId={supplyRoadId} onSelect={selectSupplyRoad} />
            <GoodsBar goodId={goodId} onChange={setGoodId} />
            <AnimatePresence mode="wait">
              {supplyEdge ? (
                <SupplyPanel
                  key={supplyEdge.id}
                  edge={supplyEdge}
                  simulating={supplySim}
                  onSimulate={() => setSupplySim(true)}
                  onStop={() => setSupplySim(false)}
                  onClose={closeSupplyRoad}
                  closureHours={closureHours}
                  onClosureHours={setClosureHours}
                  analysis={analysis}
                  recommendations={supplyAdvice}
                  goodId={goodId}
                  onGood={setGoodId}
                  depotId={depotId}
                  onDepot={setDepotId}
                />
              ) : null}
            </AnimatePresence>
            {!supplyEdge && (
              <>
                <SupplyIntro />
                <SupplyTray onSelect={selectSupplyRoad} />
              </>
            )}
          </>
        )}

        {view === "disaster" && <DisasterView sim={sim} />}

        {view === "copilot" && <CopilotView copilot={copilot} />}
      </main>
    </MotionConfig>
  );
}
