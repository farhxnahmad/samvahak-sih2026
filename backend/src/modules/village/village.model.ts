import { Schema, Types, model } from "mongoose";
import { IGeoPoint, pointSchema } from "../../utils/geoPoint";

export interface IVillage {
  name: string;
  district: Types.ObjectId; // District contains Villages
  location: IGeoPoint;
  population?: number;
  elevationM?: number;
  hasRoadAccess: boolean;
  nearestHealthFacilityKm?: number;
  createdAt: Date;
  updatedAt: Date;
}

const villageSchema = new Schema<IVillage>(
  {
    name: { type: String, required: true, trim: true },
    district: { type: Schema.Types.ObjectId, ref: "District", required: true },
    location: { type: pointSchema, required: true },
    population: { type: Number, min: 0 },
    elevationM: { type: Number },
    hasRoadAccess: { type: Boolean, default: true },
    nearestHealthFacilityKm: { type: Number, min: 0 },
  },
  { timestamps: true }
);

villageSchema.index({ district: 1, name: 1 }, { unique: true });
villageSchema.index({ location: "2dsphere" }); // "villages near this point"

export const Village = model<IVillage>("Village", villageSchema);
