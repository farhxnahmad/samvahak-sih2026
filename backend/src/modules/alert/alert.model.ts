import { Schema, Types, model } from "mongoose";
import {
  ALERT_STATUSES,
  AlertStatus,
  HAZARD_TYPES,
  HazardType,
  SEVERITY_LEVELS,
  Severity,
} from "../../constants/enums";

export interface IAlert {
  district: Types.ObjectId; // Alerts belong to Districts
  title: string;
  message: string;
  severity: Severity; // alert level: low | medium | high | critical
  hazardType: HazardType;
  status: AlertStatus;
  issuedBy: Types.ObjectId;
  incident?: Types.ObjectId; // optional trigger
  riskScore?: Types.ObjectId; // optional trigger
  startsAt: Date;
  expiresAt?: Date;
  broadcastCount: number;
  lastBroadcastAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const alertSchema = new Schema<IAlert>(
  {
    district: { type: Schema.Types.ObjectId, ref: "District", required: true },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    severity: { type: String, enum: SEVERITY_LEVELS, required: true },
    hazardType: { type: String, enum: HAZARD_TYPES, default: "overall" },
    status: { type: String, enum: ALERT_STATUSES, default: "active" },
    issuedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    incident: { type: Schema.Types.ObjectId, ref: "Incident" },
    riskScore: { type: Schema.Types.ObjectId, ref: "RiskScore" },
    startsAt: { type: Date, default: Date.now },
    expiresAt: { type: Date },
    broadcastCount: { type: Number, default: 0 },
    lastBroadcastAt: { type: Date },
  },
  { timestamps: true }
);

alertSchema.index({ district: 1, status: 1, startsAt: -1 }); // active alerts per district
alertSchema.index({ status: 1, severity: 1, startsAt: -1 }); // global active feed, history

export const Alert = model<IAlert>("Alert", alertSchema);
