import { Schema, Types, model } from "mongoose";
import {
  SCENARIO_TYPES,
  SEVERITY_LEVELS,
  SIMULATION_STATUSES,
  ScenarioType,
  Severity,
  SimulationStatus,
} from "../../constants/enums";

/** One entry per village in the district - this is a hypothetical projection, never a write to Village. */
export interface ISimulationImpact {
  village: Types.ObjectId;
  villageName: string; // denormalized so the result reads standalone, without a populate() call
  impactLevel: Severity;
  estimatedAffectedPopulation: number;
  roadAccessLost: boolean;
}

export interface ISimulationSummary {
  totalVillagesAffected: number;
  totalPopulationImpact: number;
  districtPopulation: number;
  populationImpactPercent: number; // 0-100
  villagesLosingRoadAccess: number;
  accessibilityImpactPercent: number; // 0-100, share of villages losing road access
}

export interface ISimulation {
  name: string;
  scenarioType: ScenarioType;
  district: Types.ObjectId;
  severity: Severity; // primary input, alongside district
  createdBy: Types.ObjectId;
  status: SimulationStatus;
  impacts: ISimulationImpact[]; // Affected Villages + Population Impact
  summary: ISimulationSummary; // Population Impact + Accessibility Impact, aggregated
  recommendations: string[]; // Emergency Recommendations
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const impactSchema = new Schema<ISimulationImpact>(
  {
    village: { type: Schema.Types.ObjectId, ref: "Village", required: true },
    villageName: { type: String, required: true },
    impactLevel: { type: String, enum: SEVERITY_LEVELS, required: true },
    estimatedAffectedPopulation: { type: Number, required: true, min: 0 },
    roadAccessLost: { type: Boolean, default: false },
  },
  { _id: false }
);

const summarySchema = new Schema<ISimulationSummary>(
  {
    totalVillagesAffected: { type: Number, required: true, min: 0 },
    totalPopulationImpact: { type: Number, required: true, min: 0 },
    districtPopulation: { type: Number, required: true, min: 0 },
    populationImpactPercent: { type: Number, required: true, min: 0, max: 100 },
    villagesLosingRoadAccess: { type: Number, required: true, min: 0 },
    accessibilityImpactPercent: { type: Number, required: true, min: 0, max: 100 },
  },
  { _id: false }
);

const simulationSchema = new Schema<ISimulation>(
  {
    name: { type: String, required: true, trim: true },
    scenarioType: { type: String, enum: SCENARIO_TYPES, required: true },
    district: { type: Schema.Types.ObjectId, ref: "District", required: true },
    severity: { type: String, enum: SEVERITY_LEVELS, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: SIMULATION_STATUSES, default: "pending" },
    impacts: { type: [impactSchema], default: [] },
    summary: { type: summarySchema },
    recommendations: { type: [String], default: [] },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

simulationSchema.index({ district: 1, createdAt: -1 });
simulationSchema.index({ createdBy: 1, createdAt: -1 });
simulationSchema.index({ "impacts.village": 1 }); // "which simulations hit this village"

export const Simulation = model<ISimulation>("Simulation", simulationSchema);
