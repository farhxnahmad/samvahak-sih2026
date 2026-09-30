import { Ban, CloudRain, Construction, Mountain, Waves, type LucideIcon } from "lucide-react";
import type { DisasterType } from "@/lib/disaster/types";

export const TYPE_ICON: Record<DisasterType, LucideIcon> = {
  flood: Waves,
  landslide: Mountain,
  bridge: Construction,
  blockage: Ban,
  rainfall: CloudRain,
};
