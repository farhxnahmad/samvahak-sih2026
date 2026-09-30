export const USER_ROLES = [
  "super_admin",
  "government_officer",
  "district_officer",
  "field_reporter",
  "citizen",
] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const ROLE_LABEL: Record<UserRole, string> = {
  super_admin: "Super admin",
  government_officer: "Government officer",
  district_officer: "District officer",
  field_reporter: "Field reporter",
  citizen: "Citizen",
};

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  district?: string;
}

export interface Session {
  user: AuthUser;
  token: string;
}
