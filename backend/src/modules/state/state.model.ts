import { Schema, model } from "mongoose";
import { IGeoPoint, pointSchema } from "../../utils/geoPoint";

export interface IState {
  name: string;
  code: string; // e.g. "AS" for Assam
  centroid?: IGeoPoint;
  population?: number;
  createdAt: Date;
  updatedAt: Date;
}

const stateSchema = new Schema<IState>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    centroid: pointSchema,
    population: { type: Number, min: 0 },
  },
  { timestamps: true }
);

export const State = model<IState>("State", stateSchema);
