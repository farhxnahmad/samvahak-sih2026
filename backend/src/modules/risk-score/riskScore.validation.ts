import { HAZARD_TYPES, HazardType } from "../../constants/enums";
import { AppError } from "../../utils/AppError";
import { isValidObjectId } from "../../utils/objectId";

export interface CalculateRiskInput {
  district: string;
  hazardType: HazardType;
  weatherSeverityScore: number;
  routeConditionScore: number;
  lookbackDays: number;
}

type FieldError = { field: string; message: string };
const asObject = (body: unknown): Record<string, unknown> =>
  typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
const asString = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

export function validateCalculateRisk(body: unknown): CalculateRiskInput {
  const b = asObject(body);
  const errors: FieldError[] = [];

  const district = asString(b.district);
  const hazardTypeRaw = asString(b.hazardType);
  const hazardType = (hazardTypeRaw || "overall") as HazardType;
  const weatherSeverityScore = Number(b.weatherSeverityScore);
  const routeConditionScore = Number(b.routeConditionScore);
  const lookbackDays = b.lookbackDays === undefined ? 7 : Number(b.lookbackDays);

  if (!isValidObjectId(district)) errors.push({ field: "district", message: "A valid district id is required" });
  if (hazardTypeRaw && !HAZARD_TYPES.includes(hazardType)) {
    errors.push({ field: "hazardType", message: `hazardType must be one of: ${HAZARD_TYPES.join(", ")}` });
  }
  if (!Number.isFinite(weatherSeverityScore) || weatherSeverityScore < 0 || weatherSeverityScore > 100) {
    errors.push({ field: "weatherSeverityScore", message: "weatherSeverityScore must be a number 0-100" });
  }
  if (!Number.isFinite(routeConditionScore) || routeConditionScore < 0 || routeConditionScore > 100) {
    errors.push({ field: "routeConditionScore", message: "routeConditionScore must be a number 0-100" });
  }
  if (!Number.isFinite(lookbackDays) || lookbackDays < 1 || lookbackDays > 90) {
    errors.push({ field: "lookbackDays", message: "lookbackDays must be a number between 1 and 90" });
  }

  if (errors.length) throw new AppError(400, "Validation failed", errors);
  return { district, hazardType, weatherSeverityScore, routeConditionScore, lookbackDays };
}

export function validateRiskScoreId(id: unknown): string {
  if (!isValidObjectId(id)) throw new AppError(400, "A valid risk score id is required");
  return id;
}
