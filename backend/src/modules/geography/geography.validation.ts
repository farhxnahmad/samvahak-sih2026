import { AppError } from "../../utils/AppError";
import { isValidObjectId } from "../../utils/objectId";

/** Validates :stateId in GET /states/:stateId/districts. */
export function validateStateId(stateId: unknown): string {
  if (!isValidObjectId(stateId)) {
    throw new AppError(400, "A valid stateId is required");
  }
  return stateId;
}

/** Validates :districtId in GET /districts/:districtId/villages. */
export function validateDistrictId(districtId: unknown): string {
  if (!isValidObjectId(districtId)) {
    throw new AppError(400, "A valid districtId is required");
  }
  return districtId;
}
