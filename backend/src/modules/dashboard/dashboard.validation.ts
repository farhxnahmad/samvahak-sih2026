import { HAZARD_TYPES, HazardType } from "../../constants/enums";
import { AppError } from "../../utils/AppError";
import { isValidObjectId } from "../../utils/objectId";
import { asQueryString, parseIntInRange } from "../../utils/queryParsing";

export interface ScopeFilter {
  district?: string;
  state?: string;
}

/** district/state are optional but must be valid ids if present - shared by all four endpoints. */
export function validateScope(query: Record<string, unknown>): ScopeFilter {
  const district = asQueryString(query.district);
  const state = asQueryString(query.state);

  if (district && !isValidObjectId(district)) throw new AppError(400, "district must be a valid id");
  if (state && !isValidObjectId(state)) throw new AppError(400, "state must be a valid id");

  return { district, state };
}

export function validateDays(query: Record<string, unknown>, fallback = 30): number {
  return parseIntInRange(query.days, fallback, 1, 365);
}

export function validateHazardType(query: Record<string, unknown>): HazardType {
  const raw = asQueryString(query.hazardType) ?? "overall";
  if (!HAZARD_TYPES.includes(raw as HazardType)) {
    throw new AppError(400, `hazardType must be one of: ${HAZARD_TYPES.join(", ")}`);
  }
  return raw as HazardType;
}
