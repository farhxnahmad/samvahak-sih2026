import { Schema, Types, model } from "mongoose";
import {
  INCIDENT_STATUSES,
  INCIDENT_TYPES,
  IncidentStatus,
  IncidentType,
  SEVERITY_LEVELS,
  Severity,
} from "../../constants/enums";
import { IGeoPoint, pointSchema } from "../../utils/geoPoint";

export interface IIncidentImage {
  url: string;
  publicId: string; // Cloudinary public_id, needed to delete the image later
}

export interface IIncident {
  title: string;
  description?: string;
  type: IncidentType;
  severity: Severity;
  status: IncidentStatus;
  location: IGeoPoint; // built from latitude/longitude in the request
  state: Types.ObjectId; // derived from district, kept for fast filtering
  district: Types.ObjectId;
  village?: Types.ObjectId;
  images: IIncidentImage[];
  reportedBy: Types.ObjectId; // Users create Incidents
  verifiedBy?: Types.ObjectId;
  verifiedAt?: Date;
  closedBy?: Types.ObjectId;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const imageSchema = new Schema<IIncidentImage>(
  { url: { type: String, required: true }, publicId: { type: String, required: true } },
  { _id: false }
);

const incidentSchema = new Schema<IIncident>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    type: { type: String, enum: INCIDENT_TYPES, required: true },
    severity: { type: String, enum: SEVERITY_LEVELS, default: "medium" },
    status: { type: String, enum: INCIDENT_STATUSES, default: "reported" },
    location: { type: pointSchema, required: true },
    state: { type: Schema.Types.ObjectId, ref: "State", required: true },
    district: { type: Schema.Types.ObjectId, ref: "District", required: true },
    village: { type: Schema.Types.ObjectId, ref: "Village" },
    images: { type: [imageSchema], default: [] },
    reportedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    verifiedBy: { type: Schema.Types.ObjectId, ref: "User" },
    verifiedAt: { type: Date },
    closedBy: { type: Schema.Types.ObjectId, ref: "User" },
    resolvedAt: { type: Date },
  },
  { timestamps: true }
);

incidentSchema.index({ location: "2dsphere" });
incidentSchema.index({ district: 1, status: 1, createdAt: -1 }); // district dashboards
incidentSchema.index({ state: 1, status: 1, createdAt: -1 }); // state-wide dashboards
incidentSchema.index({ reportedBy: 1, createdAt: -1 }); // "my reports"

export const Incident = model<IIncident>("Incident", incidentSchema);
