import bcrypt from "bcryptjs";
import { Types } from "mongoose";
import { UserRole } from "../../constants/enums";
import { AppError } from "../../utils/AppError";
import { signToken } from "../../utils/jwt";
import { District } from "../district/district.model";
import { IUser, User } from "../user/user.model";
import { CreateStaffInput, LoginInput, RegisterInput } from "./auth.validation";

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  district?: string;
}

const toPublicUser = (user: IUser & { _id: Types.ObjectId }): PublicUser => ({
  id: user._id.toString(),
  name: user.name,
  email: user.email,
  role: user.role,
  district: user.district?.toString(),
});

const issueToken = (user: IUser & { _id: Types.ObjectId }) =>
  signToken({ sub: user._id.toString(), role: user.role });

export const hashPassword = (password: string) => bcrypt.hash(password, 10);

/** Public sign-up. Always creates a citizen, whatever the client sends. */
export async function registerCitizen(input: RegisterInput) {
  if (await User.exists({ email: input.email })) {
    throw new AppError(409, "An account with this email already exists");
  }

  const user = await User.create({
    name: input.name,
    email: input.email,
    passwordHash: await hashPassword(input.password),
    role: "citizen",
  });

  return { user: toPublicUser(user), token: issueToken(user) };
}

export async function login(input: LoginInput) {
  const user = await User.findOne({ email: input.email }).select("+passwordHash");

  // Same message for unknown email and wrong password, so emails can't be probed.
  const valid = user ? await bcrypt.compare(input.password, user.passwordHash) : false;
  if (!user || !valid) throw new AppError(401, "Invalid email or password");
  if (!user.isActive) throw new AppError(403, "This account has been deactivated");

  return { user: toPublicUser(user), token: issueToken(user) };
}

/** Super admin only (enforced in the routes). Creates any non-citizen account. */
export async function createStaff(input: CreateStaffInput) {
  if (await User.exists({ email: input.email })) {
    throw new AppError(409, "An account with this email already exists");
  }
  if (input.district && !(await District.exists({ _id: input.district }))) {
    throw new AppError(404, "District not found");
  }

  const user = await User.create({
    name: input.name,
    email: input.email,
    passwordHash: await hashPassword(input.password),
    role: input.role,
    district: input.district,
  });

  return toPublicUser(user);
}
