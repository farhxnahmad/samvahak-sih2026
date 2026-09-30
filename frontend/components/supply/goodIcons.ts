import { Flame, Fuel, Package, Pill, Wheat, type LucideIcon } from "lucide-react";
import type { GoodId } from "@/lib/supply/goods";

export const GOOD_ICON: Record<GoodId, LucideIcon> = {
  medicine: Pill,
  food: Wheat,
  lpg: Flame,
  fuel: Fuel,
  relief: Package,
};
