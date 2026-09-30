import { AppError } from "../../utils/AppError";

export interface AskCopilotInput {
  question: string;
}

const MIN_LENGTH = 5;
const MAX_LENGTH = 500;

export function validateAskCopilot(body: unknown): AskCopilotInput {
  const question =
    typeof body === "object" && body !== null && typeof (body as Record<string, unknown>).question === "string"
      ? ((body as Record<string, unknown>).question as string).trim()
      : "";

  if (question.length < MIN_LENGTH || question.length > MAX_LENGTH) {
    throw new AppError(400, "Validation failed", [
      { field: "question", message: `question must be between ${MIN_LENGTH} and ${MAX_LENGTH} characters` },
    ]);
  }

  return { question };
}
