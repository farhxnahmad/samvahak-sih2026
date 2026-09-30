import { UserRole } from "../../constants/enums";
import { AppError } from "../../utils/AppError";
import { UploadedImage, uploadBuffers } from "../../utils/cloudinaryUpload";
import { District } from "../district/district.model";
import { Village } from "../village/village.model";
import { CreateIncidentInput, UpdateIncidentInput } from "./incident.validation";
import { IIncident, Incident } from "./incident.model";

const MODERATOR_ROLES: UserRole[] = ["district_officer", "government_officer"];

/** super_admin can moderate anything; district/government officers can moderate any incident. */
export const canModerate = (role: UserRole) => role === "super_admin" || MODERATOR_ROLES.includes(role);

async function resolveDistrictAndState(districtId: string) {
  const district = await District.findById(districtId);
  if (!district) throw new AppError(404, "District not found");
  return { district, state: district.state }; // state is derived, not taken from the client
}

async function assertVillageInDistrict(villageId: string, districtId: string) {
  const village = await Village.findById(villageId);
  if (!village) throw new AppError(404, "Village not found");
  if (village.district.toString() !== districtId) {
    throw new AppError(400, "village does not belong to the given district");
  }
}

export interface ListIncidentsFilter {
  district?: string;
  state?: string;
  status?: string;
  type?: string;
  severity?: string;
}

export function listIncidents(filter: ListIncidentsFilter) {
  const query: Record<string, unknown> = {};
  if (filter.district) query.district = filter.district;
  if (filter.state) query.state = filter.state;
  if (filter.status) query.status = filter.status;
  if (filter.type) query.type = filter.type;
  if (filter.severity) query.severity = filter.severity;
  return Incident.find(query).sort({ createdAt: -1 });
}

export async function getIncidentById(id: string) {
  const incident = await Incident.findById(id);
  if (!incident) throw new AppError(404, "Incident not found");
  return incident;
}

export async function createIncident(input: CreateIncidentInput, reportedBy: string) {
  const { state } = await resolveDistrictAndState(input.district);
  if (input.village) await assertVillageInDistrict(input.village, input.district);

  return Incident.create({
    title: input.title,
    description: input.description,
    type: input.type,
    severity: input.severity,
    district: input.district,
    state,
    village: input.village,
    location: { type: "Point", coordinates: [input.longitude, input.latitude] },
    reportedBy,
  });
}

function assertCanModify(incident: IIncident, userId: string, role: UserRole) {
  const isOwner = incident.reportedBy.toString() === userId;
  if (!isOwner && !canModerate(role)) {
    throw new AppError(403, "You do not have permission to modify this incident");
  }
}

export async function updateIncident(
  id: string,
  input: UpdateIncidentInput,
  actor: { id: string; role: UserRole }
) {
  const incident = await getIncidentById(id);
  assertCanModify(incident, actor.id, actor.role);

  if (input.title !== undefined) incident.title = input.title;
  if (input.description !== undefined) incident.description = input.description;
  if (input.type !== undefined) incident.type = input.type;
  if (input.severity !== undefined) incident.severity = input.severity;

  const districtId = input.district ?? incident.district.toString();
  if (input.district !== undefined) {
    const { state } = await resolveDistrictAndState(input.district);
    incident.district = input.district as unknown as typeof incident.district;
    incident.state = state;
  }
  if (input.village !== undefined) {
    if (input.village) await assertVillageInDistrict(input.village, districtId);
    incident.village = (input.village || undefined) as unknown as typeof incident.village;
  }
  if (input.latitude !== undefined && input.longitude !== undefined) {
    incident.location = { type: "Point", coordinates: [input.longitude, input.latitude] };
  }

  return incident.save();
}

/** Moderator-only (enforced in the routes). Sets status to "verified". */
export async function verifyIncident(id: string, verifiedBy: string) {
  const incident = await getIncidentById(id);
  if (incident.status === "resolved" || incident.status === "rejected") {
    throw new AppError(400, `Cannot verify an incident that is already ${incident.status}`);
  }
  incident.status = "verified";
  incident.verifiedBy = verifiedBy as unknown as typeof incident.verifiedBy;
  incident.verifiedAt = new Date();
  return incident.save();
}

/** Moderator-only (enforced in the routes). Sets status to "resolved". */
export async function closeIncident(id: string, closedBy: string) {
  const incident = await getIncidentById(id);
  if (incident.status === "resolved") throw new AppError(400, "Incident is already resolved");
  incident.status = "resolved";
  incident.closedBy = closedBy as unknown as typeof incident.closedBy;
  incident.resolvedAt = new Date();
  return incident.save();
}

export async function addImages(
  id: string,
  files: Express.Multer.File[],
  actor: { id: string; role: UserRole }
) {
  if (!files.length) throw new AppError(400, "At least one image file is required");

  const incident = await getIncidentById(id);
  assertCanModify(incident, actor.id, actor.role);

  const uploaded: UploadedImage[] = await uploadBuffers(
    files.map((f) => f.buffer),
    `samvahak/incidents/${incident.id}`
  );

  incident.images.push(...uploaded);
  return incident.save();
}
