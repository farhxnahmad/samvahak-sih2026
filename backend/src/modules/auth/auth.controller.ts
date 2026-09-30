import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import * as authService from "./auth.service";
import { validateCreateStaff, validateLogin, validateRegister } from "./auth.validation";

export const register = asyncHandler(async (req: Request, res: Response) => {
  const data = await authService.registerCitizen(validateRegister(req.body));
  res.status(201).json({ success: true, data });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const data = await authService.login(validateLogin(req.body));
  res.json({ success: true, data });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, data: { user: req.user } });
});

export const createStaff = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.createStaff(validateCreateStaff(req.body));
  res.status(201).json({ success: true, data: { user } });
});
