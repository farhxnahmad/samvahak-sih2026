import { Alert } from "../alert/alert.model";
import { getActiveIncidentsSummary, getDistrictRiskScores } from "../dashboard/dashboard.service";
import { District } from "../district/district.model";
import { State } from "../state/state.model";
import { Village } from "../village/village.model";

/**
 * Everything the Copilot is allowed to reason about, gathered fresh for each question.
 * Kept deliberately summarized (not a full DB dump) so it fits comfortably in a prompt.
 * Reuses the Dashboard module's aggregations for incidents/risk scores instead of re-querying.
 */
export interface CopilotContext {
  generatedAt: string;
  states: { id: string; name: string; code: string }[];
  districts: { id: string; name: string; state: string; population?: number }[];
  activeIncidents: Awaited<ReturnType<typeof getActiveIncidentsSummary>>;
  districtRiskScores: Awaited<ReturnType<typeof getDistrictRiskScores>>;
  activeAlerts: {
    title: string;
    message: string;
    severity: string;
    hazardType: string;
    district: string;
    startsAt: Date;
    expiresAt?: Date;
  }[];
  villagesWithoutRoadAccess: {
    name: string;
    district: string;
    population?: number;
  }[];
}

export async function buildCopilotContext(): Promise<CopilotContext> {
  const [states, districts, activeIncidents, districtRiskScores, activeAlerts, isolatedVillages] =
    await Promise.all([
      State.find().select("name code").lean(),
      District.find().select("name state population").lean(),
      getActiveIncidentsSummary({}), // reuse the Dashboard module - no district/state filter
      getDistrictRiskScores({}, "overall"),
      Alert.find({ status: "active" })
        .sort({ startsAt: -1 })
        .limit(20)
        .populate("district", "name")
        .select("title message severity hazardType district startsAt expiresAt")
        .lean(),
      Village.find({ hasRoadAccess: false })
        .limit(50)
        .populate("district", "name")
        .select("name district population")
        .lean(),
    ]);

  return {
    generatedAt: new Date().toISOString(),
    states: states.map((s) => ({ id: s._id.toString(), name: s.name, code: s.code })),
    districts: districts.map((d) => ({
      id: d._id.toString(),
      name: d.name,
      state: d.state.toString(),
      population: d.population,
    })),
    activeIncidents,
    districtRiskScores,
    activeAlerts: activeAlerts.map((a) => ({
      title: a.title,
      message: a.message,
      severity: a.severity,
      hazardType: a.hazardType,
      district: (a.district as unknown as { name: string })?.name ?? "Unknown",
      startsAt: a.startsAt,
      expiresAt: a.expiresAt,
    })),
    villagesWithoutRoadAccess: isolatedVillages.map((v) => ({
      name: v.name,
      district: (v.district as unknown as { name: string })?.name ?? "Unknown",
      population: v.population,
    })),
  };
}
