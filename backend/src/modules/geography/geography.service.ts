import { AppError } from "../../utils/AppError";
import { District } from "../district/district.model";
import { State } from "../state/state.model";
import { Village } from "../village/village.model";

export const listStates = () => State.find().sort({ name: 1 });

export async function listDistrictsByState(stateId: string) {
  if (!(await State.exists({ _id: stateId }))) {
    throw new AppError(404, "State not found");
  }
  return District.find({ state: stateId }).sort({ name: 1 });
}

export async function listVillagesByDistrict(districtId: string) {
  if (!(await District.exists({ _id: districtId }))) {
    throw new AppError(404, "District not found");
  }
  return Village.find({ district: districtId }).sort({ name: 1 });
}
