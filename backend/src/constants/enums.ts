export const USER_ROLES = [
  "super_admin",
  "government_officer",
  "district_officer",
  "field_reporter",
  "citizen",
] as const;
export type UserRole = (typeof USER_ROLES)[number];

/** Everyone except citizens. Only a super admin can create these accounts. */
export const STAFF_ROLES = USER_ROLES.filter((r) => r !== "citizen") as UserRole[];

/** Used for incident severity, alert severity and risk level. */
export const SEVERITY_LEVELS = ["low", "medium", "high", "critical"] as const;
export type Severity = (typeof SEVERITY_LEVELS)[number];

export const INCIDENT_TYPES = [
  "flood",
  "landslide",
  "road_blockage",
  "bridge_damage",
  "heavy_rainfall",
  "accident",
] as const;
export type IncidentType = (typeof INCIDENT_TYPES)[number];

export const INCIDENT_STATUSES = ["reported", "verified", "in_progress", "resolved", "rejected"] as const;
export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];

export const HAZARD_TYPES = ["overall", "flood", "landslide", "road_disruption"] as const;
export type HazardType = (typeof HAZARD_TYPES)[number];

/** Simulation scenarios (everything except "overall"). */
export const SCENARIO_TYPES = ["flood", "landslide", "road_closure", "bridge_failure"] as const;
export type ScenarioType = (typeof SCENARIO_TYPES)[number];

export const ALERT_STATUSES = ["active", "resolved", "expired"] as const;
export type AlertStatus = (typeof ALERT_STATUSES)[number];

export const SIMULATION_STATUSES = ["pending", "completed", "failed"] as const;
export type SimulationStatus = (typeof SIMULATION_STATUSES)[number];

/** Accessibility Risk Engine output category. Distinct from SEVERITY_LEVELS ("moderate" not "medium"). */
export const RISK_CATEGORIES = ["low", "moderate", "high", "critical"] as const;
export type RiskCategory = (typeof RISK_CATEGORIES)[number];
