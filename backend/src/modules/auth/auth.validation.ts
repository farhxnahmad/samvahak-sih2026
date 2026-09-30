import { STAFF_ROLES, UserRole } from "../../constants/enums";
import { AppError } from "../../utils/AppError";

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface CreateStaffInput extends RegisterInput {
  role: UserRole;
  district?: string;
}

type FieldError = { field: string; message: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OBJECT_ID_RE = /^[a-f\d]{24}$/i;

const asObject = (body: unknown): Record<string, unknown> =>
  typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};

const asString = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

function throwIfErrors(errors: FieldError[]) {
  if (errors.length) throw new AppError(400, "Validation failed", errors);
}

function readRegisterFields(b: Record<string, unknown>, errors: FieldError[]): RegisterInput {
  const name = asString(b.name);
  const email = asString(b.email).toLowerCase();
  const password = typeof b.password === "string" ? b.password : "";

  if (!name) errors.push({ field: "name", message: "Name is required" });
  if (!EMAIL_RE.test(email)) errors.push({ field: "email", message: "A valid email is required" });
  if (password.length < 8) errors.push({ field: "password", message: "Password must be at least 8 characters" });

  return { name, email, password };
}

export function validateRegister(body: unknown): RegisterInput {
  const errors: FieldError[] = [];
  const input = readRegisterFields(asObject(body), errors);
  throwIfErrors(errors);
  return input;
}

export function validateLogin(body: unknown): LoginInput {
  const b = asObject(body);
  const email = asString(b.email).toLowerCase();
  const password = typeof b.password === "string" ? b.password : "";
  const errors: FieldError[] = [];

  if (!email) errors.push({ field: "email", message: "Email is required" });
  if (!password) errors.push({ field: "password", message: "Password is required" });
  throwIfErrors(errors);

  return { email, password };
}

export function validateCreateStaff(body: unknown): CreateStaffInput {
  const b = asObject(body);
  const errors: FieldError[] = [];
  const base = readRegisterFields(b, errors);

  const role = asString(b.role) as UserRole;
  const district = asString(b.district) || undefined;

  if (!STAFF_ROLES.includes(role)) {
    errors.push({ field: "role", message: `Role must be one of: ${STAFF_ROLES.join(", ")}` });
  }
  if (district && !OBJECT_ID_RE.test(district)) {
    errors.push({ field: "district", message: "district must be a valid id" });
  }
  if (role === "district_officer" && !district) {
    errors.push({ field: "district", message: "district is required for district officers" });
  }
  throwIfErrors(errors);

  return { ...base, role, district };
}
