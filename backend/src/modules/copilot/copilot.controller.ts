import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { askCopilot } from "./copilot.service";
import { validateAskCopilot } from "./copilot.validation";

export const ask = asyncHandler(async (req: Request, res: Response) => {
  const { question } = validateAskCopilot(req.body);
  const data = await askCopilot(question);
  res.json({ success: true, data });
});
