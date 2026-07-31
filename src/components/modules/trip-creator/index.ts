import { type DashboardWidgetKey, type TripModules } from "~/lib/trip-config";
import type { PackingPresetKey } from "~/lib/packing";
import type { CurrencyCode } from "~/lib/currencies";

export type TripFormData = {
  name: string;
  dateRange: { from: Date | undefined; to: Date | undefined };
  destinationName: string;
  destinationAddress: string;
  destinationMapUrl: string;
  defaultCurrency: CurrencyCode;
  playlistUrl: string;
  modules: TripModules;
  dashboardWidgets: DashboardWidgetKey[];
  adminName: string;
  adminPin: string;
  members: string[];
  teams: { id: string; name: string; color: string }[];
  memberAssignments: Record<string, string>;
  packingPresets: PackingPresetKey[];
};
