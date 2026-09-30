import { Type } from "@google/genai";
import { env } from "../../config/env";
import { getGeminiClient } from "../../config/gemini";
import { AppError } from "../../utils/AppError";
import { CopilotContext } from "./copilot.context";

export interface CopilotAnswer {
  answer: string;
  confidence: "low" | "medium" | "high";
  relevantDistricts: string[];
  relevantVillages: string[];
  recommendedActions: string[];
  dataSources: string[];
}

const SYSTEM_INSTRUCTION = `You are the SAMVAHAK AI Logistics Copilot, built for disaster and
logistics officials in the North Eastern Region of India (Smart India Hackathon 2026, team ByteMe).

Answer ONLY using the JSON context provided in the user message (incidents, risk scores, alerts
and geography data). Do not invent districts, villages, incidents or figures that are not present
in the context. If the context does not contain enough information to answer confidently, say so
plainly in "answer" and set "confidence" to "low".

Be concise and operational - the audience is a district or government officer who needs to act on
this, not a general reader. Always respond in the exact JSON schema you were given.`;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    answer: { type: Type.STRING, description: "The direct answer, 2-5 sentences." },
    confidence: { type: Type.STRING, enum: ["low", "medium", "high"] },
    relevantDistricts: { type: Type.ARRAY, items: { type: Type.STRING }, description: "District names referenced in the answer." },
    relevantVillages: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Village names referenced in the answer, if any." },
    recommendedActions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Short, actionable next steps." },
    dataSources: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Which parts of the context were used, e.g. 'risk scores', 'active alerts'.",
    },
  },
  required: ["answer", "confidence", "relevantDistricts", "relevantVillages", "recommendedActions", "dataSources"],
};

function isCopilotAnswer(value: unknown): value is CopilotAnswer {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.answer === "string" &&
    typeof v.confidence === "string" &&
    Array.isArray(v.relevantDistricts) &&
    Array.isArray(v.relevantVillages) &&
    Array.isArray(v.recommendedActions) &&
    Array.isArray(v.dataSources)
  );
}

export async function askGemini(question: string, context: CopilotContext): Promise<CopilotAnswer> {
  let client;
  try {
    client = getGeminiClient();
  } catch {
    throw new AppError(503, "The AI Copilot is not configured (missing GEMINI_API_KEY)");
  }

  let response;
  try {
    response = await client.models.generateContent({
      model: env.gemini.model,
      contents: [
        {
          role: "user",
          parts: [
            {
              text:
                `Context (JSON):\n${JSON.stringify(context)}\n\n` +
                `Question: ${question}`,
            },
          ],
        },
      ],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.2, // keep it factual and consistent, not creative
      },
    });
  } catch (err) {
    throw new AppError(502, "The AI Copilot service failed to respond", {
      cause: err instanceof Error ? err.message : String(err),
    });
  }

  const text = response.text;
  if (!text) throw new AppError(502, "The AI Copilot returned an empty response");

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new AppError(502, "The AI Copilot returned a response that was not valid JSON");
  }

  if (!isCopilotAnswer(parsed)) {
    throw new AppError(502, "The AI Copilot returned a response that did not match the expected shape");
  }

  return parsed;
}
