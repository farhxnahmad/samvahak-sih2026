import { GoogleGenAI } from "@google/genai";
import { env } from "./env";

let client: GoogleGenAI | null = null;

/** Lazily created so the app can boot even without a Gemini key; the Copilot route fails clearly instead. */
export function getGeminiClient(): GoogleGenAI {
  if (!env.gemini.apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }
  if (!client) {
    client = new GoogleGenAI({ apiKey: env.gemini.apiKey });
  }
  return client;
}
