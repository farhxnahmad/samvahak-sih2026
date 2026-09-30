import { useCallback, useMemo, useState } from "react";
import { ask } from "./engine";
import type { CopilotResponse } from "./types";

export function useCopilot() {
  const [log, setLog] = useState<CopilotResponse[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const submit = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const response = ask(trimmed);
    setLog((prev) => [response, ...prev].slice(0, 20));
    setActiveId(response.id);
  }, []);

  const active = useMemo(() => log.find((r) => r.id === activeId) ?? null, [log, activeId]);

  return { log, active, submit, select: setActiveId };
}
