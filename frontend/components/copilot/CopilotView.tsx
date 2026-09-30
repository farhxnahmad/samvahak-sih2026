"use client";

import { useState } from "react";
import BriefingPanel from "./BriefingPanel";
import ConsolePanel from "./ConsolePanel";
import ContextBar from "./ContextBar";
import type { useCopilot } from "@/lib/copilot/useCopilot";

type Copilot = ReturnType<typeof useCopilot>;

export default function CopilotView({ copilot }: { copilot: Copilot }) {
  const [panel, setPanel] = useState<"console" | "briefing">("console");

  return (
    <>
      <ConsolePanel
        log={copilot.log}
        activeId={copilot.active ? copilot.active.id : null}
        onSubmit={(text) => {
          copilot.submit(text);
          setPanel("briefing");
        }}
        onSelect={copilot.select}
        visibleOnMobile={panel === "console" || copilot.active === null}
        onShowBriefing={() => setPanel("briefing")}
      />
      <ContextBar context={copilot.active ? copilot.active.context : null} />
      {copilot.active && (
        <BriefingPanel
          response={copilot.active}
          visibleOnMobile={panel === "briefing"}
          onNewQuery={() => setPanel("console")}
        />
      )}
    </>
  );
}
