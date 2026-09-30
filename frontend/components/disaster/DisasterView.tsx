"use client";

import AlertBanner from "./AlertBanner";
import ControlsPanel from "./ControlsPanel";
import IncidentPanel from "./IncidentPanel";
import TimelineBar from "./TimelineBar";
import type { useScenario } from "@/lib/disaster/useScenario";

type Sim = ReturnType<typeof useScenario>;

export default function DisasterView({ sim }: { sim: Sim }) {
  const { config, updateConfig, scenario, step, stepIndex, playing, decisions, alerts } = sim;
  return (
    <>
      <ControlsPanel
        config={config}
        onConfig={updateConfig}
        onRun={sim.run}
        onReset={sim.reset}
        running={scenario !== null}
      />
      {scenario && step && (
        <>
          <TimelineBar
            stepIndex={stepIndex}
            playing={playing}
            onStep={sim.goToStep}
            onTogglePlay={sim.togglePlay}
            onRestart={sim.run}
          />
          <AlertBanner alert={step.alerts.length > 0 ? step.alerts[0] : null} />
          <IncidentPanel
            key={scenario.config.districtId + scenario.config.type + scenario.config.severity}
            scenario={scenario}
            step={step}
            stepIndex={stepIndex}
            decisions={decisions}
            alerts={alerts}
            onEdit={sim.reset}
          />
        </>
      )}
    </>
  );
}
