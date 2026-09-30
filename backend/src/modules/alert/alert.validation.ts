import { HAZARD_TYPES, HazardType, SEVERITY_LEVELS, Severity } from "../../constants/enums";
import { AppError } from "../../utils/AppError";
import { isValidObjectId } from "../../utils/objectId";

export interface CreateAlertInput {
  title: string;
  message: string;
  severity: Severity;
  hazardType: HazardType;
  district: string;
  expiresAt?: Date;
}

type FieldError = { field: string; message: string };
const asObject = (body: unknown): Record<string, unknown> =>
  typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
const asString = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

export function validateCreateAlert(body: unknown): CreateAlertInput {
  const b = asObject(body);
  const errors: FieldError[] = [];

  const title = asString(b.title);
  const message = asString(b.message);
  // Accept "level" as a friendlier alias for "severity" - same enum either way.
  const severity = (asString(b.severity) || asString(b.level)) as Severity;
  const hazardTypeRaw = asString(b.hazardType);
  const hazardType = (hazardTypeRaw || "overall") as HazardType;
  const district = asString(b.district);

  if (!title) errors.push({ field: "title", message: "Title is required" });
  if (!message) errors.push({ field: "message", message: "Message is required" });
  if (!SEVERITY_LEVELS.includes(severity)) {
    errors.push({ field: "severity", message: `severity (alert level) must be one of: ${SEVERITY_LEVELS.join(", ")}` });
  }
  if (hazardTypeRaw && !HAZARD_TYPES.includes(hazardType)) {
    errors.push({ field: "hazardType", message: `hazardType must be one of: ${HAZARD_TYPES.join(", ")}` });
  }
  if (!isValidObjectId(district)) errors.push({ field: "district", message: "A valid district id is required" });

  let expiresAt: Date | undefined;
  if (b.expiresAt !== undefined && b.expiresAt !== null && b.expiresAt !== "") {
    const d = new Date(b.expiresAt as string);
    if (Number.isNaN(d.getTime())) errors.push({ field: "expiresAt", message: "expiresAt must be a valid date" });
    else expiresAt = d;
  }

  if (errors.length) throw new AppError(400, "Validation failed", errors);
  return { title, message, severity, hazardType, district, expiresAt };
}

export function validateAlertId(id: unknown): string {
  if (!isValidObjectId(id)) throw new AppError(400, "A valid alert id is required");
  return id;
}
