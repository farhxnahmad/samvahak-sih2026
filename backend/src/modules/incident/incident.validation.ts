import { INCIDENT_TYPES, IncidentType, SEVERITY_LEVELS, Severity } from "../../constants/enums";
import { AppError } from "../../utils/AppError";
import { isValidObjectId } from "../../utils/objectId";

export interface CreateIncidentInput {
  title: string;
  description?: string;
  type: IncidentType;
  severity: Severity;
  district: string;
  village?: string;
  latitude: number;
  longitude: number;
}

export interface UpdateIncidentInput {
  title?: string;
  description?: string;
  type?: IncidentType;
  severity?: Severity;
  district?: string;
  village?: string;
  latitude?: number;
  longitude?: number;
}

type FieldError = { field: string; message: string };
const asObject = (body: unknown): Record<string, unknown> =>
  typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
const asString = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const throwIfErrors = (errors: FieldError[]) => {
  if (errors.length) throw new AppError(400, "Validation failed", errors);
};

function readCoordinates(b: Record<string, unknown>, errors: FieldError[], required: boolean) {
  const hasLat = b.latitude !== undefined;
  const hasLng = b.longitude !== undefined;
  if (!required && !hasLat && !hasLng) return { latitude: undefined, longitude: undefined };

  const latitude = Number(b.latitude);
  const longitude = Number(b.longitude);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    errors.push({ field: "latitude", message: "latitude must be a number between -90 and 90" });
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    errors.push({ field: "longitude", message: "longitude must be a number between -180 and 180" });
  }
  return { latitude, longitude };
}

export function validateCreateIncident(body: unknown): CreateIncidentInput {
  const b = asObject(body);
  const errors: FieldError[] = [];

  const title = asString(b.title);
  const description = asString(b.description) || undefined;
  const type = asString(b.type) as IncidentType;
  const severityRaw = asString(b.severity);
  const severity = (severityRaw || "medium") as Severity;
  const district = asString(b.district);
  const village = asString(b.village) || undefined;

  if (!title) errors.push({ field: "title", message: "Title is required" });
  if (!INCIDENT_TYPES.includes(type)) {
    errors.push({ field: "type", message: `type must be one of: ${INCIDENT_TYPES.join(", ")}` });
  }
  if (severityRaw && !SEVERITY_LEVELS.includes(severity)) {
    errors.push({ field: "severity", message: `severity must be one of: ${SEVERITY_LEVELS.join(", ")}` });
  }
  if (!isValidObjectId(district)) errors.push({ field: "district", message: "A valid district id is required" });
  if (village && !isValidObjectId(village)) errors.push({ field: "village", message: "village must be a valid id" });

  const { latitude, longitude } = readCoordinates(b, errors, true);
  throwIfErrors(errors);

  return { title, description, type, severity, district, village, latitude: latitude!, longitude: longitude! };
}

export function validateUpdateIncident(body: unknown): UpdateIncidentInput {
  const b = asObject(body);
  const errors: FieldError[] = [];
  const out: UpdateIncidentInput = {};

  if (b.title !== undefined) {
    out.title = asString(b.title);
    if (!out.title) errors.push({ field: "title", message: "title cannot be empty" });
  }
  if (b.description !== undefined) out.description = asString(b.description);
  if (b.type !== undefined) {
    out.type = asString(b.type) as IncidentType;
    if (!INCIDENT_TYPES.includes(out.type)) {
      errors.push({ field: "type", message: `type must be one of: ${INCIDENT_TYPES.join(", ")}` });
    }
  }
  if (b.severity !== undefined) {
    out.severity = asString(b.severity) as Severity;
    if (!SEVERITY_LEVELS.includes(out.severity)) {
      errors.push({ field: "severity", message: `severity must be one of: ${SEVERITY_LEVELS.join(", ")}` });
    }
  }
  if (b.district !== undefined) {
    out.district = asString(b.district);
    if (!isValidObjectId(out.district)) errors.push({ field: "district", message: "district must be a valid id" });
  }
  if (b.village !== undefined) {
    out.village = asString(b.village);
    if (out.village && !isValidObjectId(out.village)) {
      errors.push({ field: "village", message: "village must be a valid id" });
    }
  }

  const { latitude, longitude } = readCoordinates(b, errors, false);
  if (latitude !== undefined) out.latitude = latitude;
  if (longitude !== undefined) out.longitude = longitude;

  throwIfErrors(errors);
  return out;
}

export function validateIncidentId(id: unknown): string {
  if (!isValidObjectId(id)) throw new AppError(400, "A valid incident id is required");
  return id;
}
