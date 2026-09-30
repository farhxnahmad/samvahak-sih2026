import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth.middleware";
import * as authController from "./auth.controller";

export const authRoutes = Router();

authRoutes.post("/register", authController.register); // public, creates a citizen
authRoutes.post("/login", authController.login); // public
authRoutes.get("/me", authenticate, authController.me); // any logged-in user
authRoutes.post("/staff", authenticate, authorize("super_admin"), authController.createStaff);
