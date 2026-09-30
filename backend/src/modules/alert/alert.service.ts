import { AppError } from "../../utils/AppError";
import { broadcastAlert, broadcastAlertUpdate } from "../../socket/socket";
import { District } from "../district/district.model";
import { Alert } from "./alert.model";
import { CreateAlertInput } from "./alert.validation";

export interface AlertHistoryFilter {
  district?: string;
  severity?: string;
  status?: string;
  hazardType?: string;
  limit?: number;
  skip?: number;
}

/** Saves the alert. Does NOT push it to clients — call broadcastExistingAlert for that. */
export async function createAlert(input: CreateAlertInput, issuedBy: string) {
  if (!(await District.exists({ _id: input.district }))) {
    throw new AppError(404, "District not found");
  }

  return Alert.create({
    title: input.title,
    message: input.message,
    severity: input.severity,
    hazardType: input.hazardType,
    district: input.district,
    expiresAt: input.expiresAt,
    issuedBy,
  });
}

export async function getAlertById(id: string) {
  const alert = await Alert.findById(id);
  if (!alert) throw new AppError(404, "Alert not found");
  return alert;
}

/** Pushes the alert over Socket.io and records that it was sent. Can be called more than once (resend). */
export async function broadcastExistingAlert(id: string) {
  const alert = await getAlertById(id);
  if (alert.status !== "active") {
    throw new AppError(400, `Cannot broadcast an alert with status "${alert.status}"`);
  }

  alert.broadcastCount += 1;
  alert.lastBroadcastAt = new Date();
  await alert.save();

  broadcastAlert(alert);
  return alert;
}

export async function resolveAlert(id: string) {
  const alert = await getAlertById(id);
  if (alert.status !== "active") throw new AppError(400, `Alert is already ${alert.status}`);

  alert.status = "resolved";
  await alert.save();

  broadcastAlertUpdate(alert);
  return alert;
}

/** Alert history: filterable, newest first. */
export function listAlerts(filter: AlertHistoryFilter) {
  const query: Record<string, unknown> = {};
  if (filter.district) query.district = filter.district;
  if (filter.severity) query.severity = filter.severity;
  if (filter.status) query.status = filter.status;
  if (filter.hazardType) query.hazardType = filter.hazardType;

  const limit = Math.min(filter.limit ?? 50, 200);
  const skip = filter.skip ?? 0;

  return Alert.find(query).sort({ startsAt: -1 }).skip(skip).limit(limit);
}
