import { Router } from "express";
import * as geographyController from "./geography.controller";

export const geographyRoutes = Router();

geographyRoutes.get("/states", geographyController.getStates);
geographyRoutes.get("/states/:stateId/districts", geographyController.getDistrictsByState);
geographyRoutes.get("/districts/:districtId/villages", geographyController.getVillagesByDistrict);
