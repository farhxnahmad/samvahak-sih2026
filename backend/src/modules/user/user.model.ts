import { Schema, Types, model } from "mongoose";
import { USER_ROLES, UserRole } from "../../constants/enums";

export interface IUser {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  district?: Types.ObjectId; // required for district officers
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: USER_ROLES, default: "citizen" },
    district: { type: Schema.Types.ObjectId, ref: "District" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

userSchema.pre("validate", function (next) {
  if (this.role === "district_officer" && !this.district) {
    this.invalidate("district", "District is required for district officers");
  }
  next();
});

export const User = model<IUser>("User", userSchema);
