import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import * as copilotController from "./copilot.controller";

export const copilotRoutes = Router();

// Any logged-in user can ask - keeps it open to citizens as well as officers, per the SIH brief.
copilotRoutes.post("/ask", authenticate, copilotController.ask);
