import { SCENARIO_TYPES, ScenarioType, SEVERITY_LEVELS, Severity } from "../../constants/enums";
import { AppError } from "../../utils/AppError";
import { isValidObjectId } from "../../utils/objectId";

export interface RunSimulationInput {
  district: string;
  scenarioType: ScenarioType;
  severity: Severity;
  name?: string;
}

type FieldError = { field: string; message: string };
const asObject = (body: unknown): Record<string, unknown> =>
  typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
const asString = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

export function validateRunSimulation(body: unknown): RunSimulationInput {
  const b = asObject(body);
  const errors: FieldError[] = [];

  const district = asString(b.district);
  const scenarioType = asString(b.scenarioType) as ScenarioType;
  const severity = asString(b.severity) as Severity;
  const name = asString(b.name) || undefined;

  if (!isValidObjectId(district)) errors.push({ field: "district", message: "A valid district id is required" });
  if (!SCENARIO_TYPES.includes(scenarioType)) {
    errors.push({ field: "scenarioType", message: `scenarioType must be one of: ${SCENARIO_TYPES.join(", ")}` });
  }
  if (!SEVERITY_LEVELS.includes(severity)) {
    errors.push({ field: "severity", message: `severity must be one of: ${SEVERITY_LEVELS.join(", ")}` });
  }

  if (errors.length) throw new AppError(400, "Validation failed", errors);
  return { district, scenarioType, severity, name };
}

export function validateSimulationId(id: unknown): string {
  if (!isValidObjectId(id)) throw new AppError(400, "A valid simulation id is required");
  return id;
}
