import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import * as geographyService from "./geography.service";
import { validateDistrictId, validateStateId } from "./geography.validation";

export const getStates = asyncHandler(async (_req: Request, res: Response) => {
  const states = await geographyService.listStates();
  res.json({ success: true, data: { states } });
});

export const getDistrictsByState = asyncHandler(async (req: Request, res: Response) => {
  const stateId = validateStateId(req.params.stateId);
  const districts = await geographyService.listDistrictsByState(stateId);
  res.json({ success: true, data: { districts } });
});

export const getVillagesByDistrict = asyncHandler(async (req: Request, res: Response) => {
  const districtId = validateDistrictId(req.params.districtId);
  const villages = await geographyService.listVillagesByDistrict(districtId);
  res.json({ success: true, data: { villages } });
});
