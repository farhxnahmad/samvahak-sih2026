import { RequestHandler } from "express";
import { UserRole } from "../constants/enums";
import { User } from "../modules/user/user.model";
import { AppError } from "../utils/AppError";
import { asyncHandler } from "../utils/asyncHandler";
import { verifyToken } from "../utils/jwt";

/** Protects a route: requires "Authorization: Bearer <token>" and sets req.user. */
export const authenticate: RequestHandler = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    throw new AppError(401, "Authentication required");
  }

  let userId: string;
  try {
    userId = verifyToken(header.slice(7)).sub;
  } catch {
    throw new AppError(401, "Invalid or expired token");
  }

  const user = await User.findById(userId);
  if (!user || !user.isActive) {
    throw new AppError(401, "Account not found or deactivated");
  }

  req.user = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    district: user.district?.toString(),
  };
  next();
});

/**
 * Role check. Use AFTER authenticate: router.get("/x", authenticate, authorize("district_officer"), handler)
 * A super admin is always allowed.
 */
export const authorize =
  (...roles: UserRole[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) return next(new AppError(401, "Authentication required"));
    if (req.user.role !== "super_admin" && !roles.includes(req.user.role)) {
      return next(new AppError(403, "You do not have permission to perform this action"));
    }
    next();
  };
