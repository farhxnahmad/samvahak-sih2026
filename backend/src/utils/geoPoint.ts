import { Schema } from "mongoose";

/** GeoJSON Point. NOTE: coordinates are [longitude, latitude], not [lat, lng]. */
export interface IGeoPoint {
  type: "Point";
  coordinates: [number, number];
}

export const pointSchema = new Schema<IGeoPoint>(
  {
    type: { type: String, enum: ["Point"], default: "Point", required: true },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: (v: number[]) =>
          v.length === 2 && v[0] >= -180 && v[0] <= 180 && v[1] >= -90 && v[1] <= 90,
        message: "coordinates must be [longitude, latitude]",
      },
    },
  },
  { _id: false }
);
