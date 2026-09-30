import { PipelineStage, Types } from "mongoose";
import { HazardType } from "../../constants/enums";
import { Alert } from "../alert/alert.model";
import { Incident } from "../incident/incident.model";
import { RiskScore } from "../risk-score/riskScore.model";
import { ScopeFilter } from "./dashboard.validation";

const ACTIVE_INCIDENT_STATUSES = ["reported", "verified", "in_progress"];

const toObjectId = (id: string) => new Types.ObjectId(id);

/** Shared $match stage for district/state scoping - both models store `district`, `district` links to `state`. */
function scopeMatch(scope: ScopeFilter, districtField = "district"): Record<string, unknown> {
  const match: Record<string, unknown> = {};
  if (scope.district) match[districtField] = toObjectId(scope.district);
  return match;
}

/**
 * Active Incidents: total + breakdowns, in one aggregation using $facet so Mongo scans the
 * matched incidents once instead of running four separate queries.
 */
export async function getActiveIncidentsSummary(scope: ScopeFilter) {
  const match: Record<string, unknown> = { status: { $in: ACTIVE_INCIDENT_STATUSES }, ...scopeMatch(scope) };
  if (scope.state) match.state = toObjectId(scope.state);

  const pipeline: PipelineStage[] = [
    { $match: match },
    {
      $facet: {
        totalCount: [{ $count: "count" }],
        bySeverity: [{ $group: { _id: "$severity", count: { $sum: 1 } } }, { $sort: { count: -1 } }],
        byType: [{ $group: { _id: "$type", count: { $sum: 1 } } }, { $sort: { count: -1 } }],
        byDistrict: [
          { $group: { _id: "$district", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
          {
            $lookup: {
              from: "districts",
              localField: "_id",
              foreignField: "_id",
              as: "district",
              pipeline: [{ $project: { name: 1 } }],
            },
          },
          { $unwind: { path: "$district", preserveNullAndEmptyArrays: true } },
          { $project: { districtId: "$_id", districtName: "$district.name", count: 1, _id: 0 } },
        ],
        recent: [
          { $sort: { createdAt: -1 } },
          { $limit: 10 },
          { $project: { title: 1, type: 1, severity: 1, status: 1, district: 1, createdAt: 1 } },
        ],
      },
    },
    { $project: { totalCount: { $ifNull: [{ $first: "$totalCount.count" }, 0] }, bySeverity: 1, byType: 1, byDistrict: 1, recent: 1 } },
  ];

  const [result] = await Incident.aggregate(pipeline);
  return result ?? { totalCount: 0, bySeverity: [], byType: [], byDistrict: [], recent: [] };
}

/**
 * Incident Trends: daily totals + severity breakdown for the last N days.
 * Two-stage $group (date+severity, then roll up by date) keeps it one aggregation call.
 */
export async function getIncidentTrends(scope: ScopeFilter, days: number) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const match: Record<string, unknown> = { createdAt: { $gte: since }, ...scopeMatch(scope) };
  if (scope.state) match.state = toObjectId(scope.state);

  const pipeline: PipelineStage[] = [
    { $match: match },
    {
      $group: {
        _id: { date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, severity: "$severity" },
        count: { $sum: 1 },
      },
    },
    {
      $group: {
        _id: "$_id.date",
        total: { $sum: "$count" },
        bySeverity: { $push: { severity: "$_id.severity", count: "$count" } },
      },
    },
    { $sort: { _id: 1 } },
    { $project: { date: "$_id", total: 1, bySeverity: 1, _id: 0 } },
  ];

  return Incident.aggregate(pipeline);
}

/**
 * District Risk Scores: the latest score per district for a given hazardType.
 * Sort newest-first, then $group + $first per district - the standard "latest per group" idiom,
 * backed by the existing {district, hazardType, computedAt} index so the sort is index-only.
 */
export async function getDistrictRiskScores(scope: ScopeFilter, hazardType: HazardType) {
  const match: Record<string, unknown> = { hazardType };
  if (scope.district) match.district = toObjectId(scope.district);

  const pipeline: PipelineStage[] = [
    { $match: match },
    { $sort: { district: 1, computedAt: -1 } },
    { $group: { _id: "$district", latest: { $first: "$$ROOT" } } },
    { $replaceRoot: { newRoot: "$latest" } },
    {
      $lookup: {
        from: "districts",
        localField: "district",
        foreignField: "_id",
        as: "districtInfo",
        pipeline: [{ $project: { name: 1, state: 1 } }],
      },
    },
    { $unwind: "$districtInfo" },
    ...(scope.state ? [{ $match: { "districtInfo.state": toObjectId(scope.state) } }] : []),
    {
      $project: {
        district: 1,
        districtName: "$districtInfo.name",
        state: "$districtInfo.state",
        hazardType: 1,
        score: 1,
        category: 1,
        explanation: 1,
        computedAt: 1,
      },
    },
    { $sort: { score: -1 } },
  ];

  return RiskScore.aggregate(pipeline);
}

/**
 * Alert Statistics: counts, breakdowns and a daily trend for the last N days, all via one $facet.
 */
export async function getAlertStatistics(scope: ScopeFilter, days: number) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const match: Record<string, unknown> = { startsAt: { $gte: since }, ...scopeMatch(scope) };

  // Alert only stores `district`, not `state` - filtering by state needs a lookup first.
  const stateLookupStages: PipelineStage[] = scope.state
    ? [
        {
          $lookup: {
            from: "districts",
            localField: "district",
            foreignField: "_id",
            as: "districtInfo",
            pipeline: [{ $project: { state: 1 } }],
          },
        },
        { $unwind: "$districtInfo" },
        { $match: { "districtInfo.state": toObjectId(scope.state) } },
      ]
    : [];

  const pipeline: PipelineStage[] = [
    { $match: match },
    ...stateLookupStages,
    {
      $facet: {
        totalCount: [{ $count: "count" }],
        activeCount: [{ $match: { status: "active" } }, { $count: "count" }],
        bySeverity: [{ $group: { _id: "$severity", count: { $sum: 1 } } }, { $sort: { count: -1 } }],
        byStatus: [{ $group: { _id: "$status", count: { $sum: 1 } } }],
        byHazardType: [{ $group: { _id: "$hazardType", count: { $sum: 1 } } }, { $sort: { count: -1 } }],
        dailyTrend: [
          { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$startsAt" } }, count: { $sum: 1 } } },
          { $sort: { _id: 1 } },
          { $project: { date: "$_id", count: 1, _id: 0 } },
        ],
      },
    },
    {
      $project: {
        totalCount: { $ifNull: [{ $first: "$totalCount.count" }, 0] },
        activeCount: { $ifNull: [{ $first: "$activeCount.count" }, 0] },
        bySeverity: 1,
        byStatus: 1,
        byHazardType: 1,
        dailyTrend: 1,
      },
    },
  ];

  const [result] = await Alert.aggregate(pipeline);
  return result ?? { totalCount: 0, activeCount: 0, bySeverity: [], byStatus: [], byHazardType: [], dailyTrend: [] };
}
