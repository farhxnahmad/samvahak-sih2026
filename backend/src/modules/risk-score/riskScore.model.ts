import { Schema, Types, model } from "mongoose";
import { HAZARD_TYPES, HazardType, RISK_CATEGORIES, RiskCategory } from "../../constants/enums";

export interface IRiskInputs {
  incidentCount: number; // relevant incidents in the lookback window
  incidentSeverityScore: number; // 0-100, avg. severity of those incidents
  weatherSeverityScore: number; // 0-100
  routeConditionScore: number; // 0-100, HIGHER = WORSE road condition
}

export interface IRiskScore {
  district: Types.ObjectId; // Districts have Risk Scores
  hazardType: HazardType;
  score: number; // 0-100
  category: RiskCategory;
  inputs: IRiskInputs;
  explanation: string; // short, human-readable, e.g. "Tawang risk increased due to..."
  computedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const scoreField = { type: Number, required: true, min: 0, max: 100 };

const riskScoreSchema = new Schema<IRiskScore>(
  {
    district: { type: Schema.Types.ObjectId, ref: "District", required: true },
    hazardType: { type: String, enum: HAZARD_TYPES, default: "overall" },
    score: { type: Number, required: true, min: 0, max: 100 },
    category: { type: String, enum: RISK_CATEGORIES, required: true },
    inputs: {
      incidentCount: { type: Number, required: true, min: 0 },
      incidentSeverityScore: scoreField,
      weatherSeverityScore: scoreField,
      routeConditionScore: scoreField,
    },
    explanation: { type: String, required: true, trim: true },
    computedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Scores are kept as history; "latest score for a district" = sort by computedAt desc.
riskScoreSchema.index({ district: 1, hazardType: 1, computedAt: -1 });

export const RiskScore = model<IRiskScore>("RiskScore", riskScoreSchema);
