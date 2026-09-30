import { useCallback, useEffect, useMemo, useState } from "react";
import { DISTRICT_INPUTS } from "../risk/districts";
import { decisionsFor } from "./decide";
import { runScenario } from "./engine";
import {
  STEPS,
  type Decision,
  type DisasterAlert,
  type Scenario,
  type ScenarioConfig,
  type StepResult,
} from "./types";

export const DISTRICT_OPTIONS = DISTRICT_INPUTS.map((d) => ({ id: d.id, name: d.name, state: d.state, pos: d.pos }));
export const STATE_OPTIONS = Array.from(new Set(DISTRICT_OPTIONS.map((d) => d.state))).sort();

const DEFAULT_CONFIG: ScenarioConfig = {
  state: "Meghalaya",
  districtId: "east-khasi-hills",
  type: "landslide",
  severity: 3,
};

const STEP_MS = 2600;

export function useScenario() {
  const [config, setConfig] = useState<ScenarioConfig>(DEFAULT_CONFIG);
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [playing, setPlaying] = useState(false);

  const updateConfig = useCallback((patch: Partial<ScenarioConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...patch };
      if (patch.state && patch.state !== prev.state) {
        const first = DISTRICT_OPTIONS.find((d) => d.state === patch.state);
        if (first) next.districtId = first.id;
      }
      return next;
    });
  }, []);

  const run = useCallback(() => {
    setScenario(runScenario(config));
    setStepIndex(0);
    setPlaying(true);
  }, [config]);

  const reset = useCallback(() => {
    setScenario(null);
    setStepIndex(0);
    setPlaying(false);
  }, []);

  const togglePlay = useCallback(() => {
    if (!scenario) return;
    if (stepIndex >= STEPS.length - 1) {
      setStepIndex(0);
      setPlaying(true);
    } else {
      setPlaying((p) => !p);
    }
  }, [scenario, stepIndex]);

  const goToStep = useCallback((index: number) => {
    setPlaying(false);
    setStepIndex(index);
  }, []);

  useEffect(() => {
    if (!playing || !scenario) return undefined;
    if (stepIndex >= STEPS.length - 1) {
      setPlaying(false);
      return undefined;
    }
    const id = window.setTimeout(() => setStepIndex((i) => i + 1), STEP_MS);
    return () => window.clearTimeout(id);
  }, [playing, scenario, stepIndex]);

  const step: StepResult | null = scenario ? scenario.steps[stepIndex] : null;

  const decisions: Decision[] = useMemo(
    () => (scenario ? decisionsFor(scenario, stepIndex) : []),
    [scenario, stepIndex]
  );

  const alerts: DisasterAlert[] = useMemo(() => {
    if (!scenario) return [];
    const upTo = scenario.steps.slice(0, stepIndex + 1);
    return upTo.flatMap((s) => s.alerts).reverse();
  }, [scenario, stepIndex]);

  const districtPreview = DISTRICT_OPTIONS.find((d) => d.id === config.districtId) ?? null;

  return {
    config,
    updateConfig,
    scenario,
    step,
    stepIndex,
    playing,
    decisions,
    alerts,
    districtPreview,
    run,
    reset,
    togglePlay,
    goToStep,
  };
}
