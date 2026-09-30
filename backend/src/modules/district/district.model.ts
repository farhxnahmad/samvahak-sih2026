import { Schema, Types, model } from "mongoose";
import { IGeoPoint, pointSchema } from "../../utils/geoPoint";

export interface IDistrict {
  name: string;
  state: Types.ObjectId; // State contains Districts
  centroid?: IGeoPoint;
  population?: number;
  createdAt: Date;
  updatedAt: Date;
}

const districtSchema = new Schema<IDistrict>(
  {
    name: { type: String, required: true, trim: true },
    state: { type: Schema.Types.ObjectId, ref: "State", required: true },
    centroid: pointSchema,
    population: { type: Number, min: 0 },
  },
  { timestamps: true }
);

// A district name is unique within its state; also serves "districts of a state" lookups.
districtSchema.index({ state: 1, name: 1 }, { unique: true });

export const District = model<IDistrict>("District", districtSchema);
