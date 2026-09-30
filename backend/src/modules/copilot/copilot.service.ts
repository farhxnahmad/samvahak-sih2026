import { buildCopilotContext } from "./copilot.context";
import { askGemini, CopilotAnswer } from "./copilot.gemini";

export interface CopilotResponse extends CopilotAnswer {
  question: string;
  contextSummary: {
    generatedAt: string;
    districtsConsidered: number;
    activeIncidentsConsidered: number;
    activeAlertsConsidered: number;
  };
}

/**
 * Answers a logistics/accessibility question using live data - incidents, risk scores, alerts
 * and geography - gathered fresh for this call. The AI never writes to the database; this is a
 * read-only Q&A endpoint.
 */
export async function askCopilot(question: string): Promise<CopilotResponse> {
  const context = await buildCopilotContext();
  const answer = await askGemini(question, context);

  return {
    ...answer,
    question,
    contextSummary: {
      generatedAt: context.generatedAt,
      districtsConsidered: context.districts.length,
      activeIncidentsConsidered: context.activeIncidents.totalCount,
      activeAlertsConsidered: context.activeAlerts.length,
    },
  };
}
