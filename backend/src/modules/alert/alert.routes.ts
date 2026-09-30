import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth.middleware";
import * as alertController from "./alert.controller";

export const alertRoutes = Router();

alertRoutes.get("/", alertController.listAlerts); // Alert History, public
alertRoutes.get("/:id", alertController.getAlert);

const ISSUER_ROLES = ["district_officer", "government_officer"] as const;

alertRoutes.post("/", authenticate, authorize(...ISSUER_ROLES), alertController.createAlert);
alertRoutes.post("/:id/broadcast", authenticate, authorize(...ISSUER_ROLES), alertController.broadcastAlert);
alertRoutes.patch("/:id/resolve", authenticate, authorize(...ISSUER_ROLES), alertController.resolveAlert);
