import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth.middleware";
import { uploadIncidentImages } from "../../middleware/upload.middleware";
import * as incidentController from "./incident.controller";

export const incidentRoutes = Router();

incidentRoutes.get("/", incidentController.listIncidents); // public read, filterable via query params
incidentRoutes.get("/:id", incidentController.getIncident);

incidentRoutes.post("/", authenticate, incidentController.createIncident); // any logged-in user
incidentRoutes.patch("/:id", authenticate, incidentController.updateIncident); // owner or moderator

incidentRoutes.patch(
  "/:id/verify",
  authenticate,
  authorize("district_officer", "government_officer"),
  incidentController.verifyIncident
);
incidentRoutes.patch(
  "/:id/close",
  authenticate,
  authorize("district_officer", "government_officer"),
  incidentController.closeIncident
);

incidentRoutes.post(
  "/:id/images",
  authenticate,
  uploadIncidentImages,
  incidentController.uploadImages
); // owner or moderator, checked in the service
