import type { CurrencyCode } from "~/lib/currencies";
import type { ExpenseVisibility } from "~/lib/expense-visibility";
import type { FinanceMode, SettlementStrategy } from "~/lib/finances";
import type { PackingPresetKey } from "~/lib/packing";
import type { GameplayDashboardWidgetKey, TripModules, TripNavigationKey } from "~/lib/trip-config";
import type { TripThemeKey } from "~/lib/themes";

export type SettingsView =
  | "menu"
  | "profile"
  | "details"
  | "appearance"
  | "modules"
  | "widgets"
  | "finances"
  | "packing"
  | "playlists"
  | "participants"
  | "lifecycle";

export const SETTINGS_VIEWS: readonly SettingsView[] = [
  "menu",
  "profile",
  "details",
  "appearance",
  "modules",
  "widgets",
  "finances",
  "packing",
  "playlists",
  "participants",
  "lifecycle",
];

export type TripSettingsState = {
  name: string;
  startDate: string;
  endDate: string;
  destinationName: string;
  destinationAddress: string;
  destinationMapUrl: string;
  playlistUrl: string;
  defaultCurrency: CurrencyCode;
  theme: TripThemeKey;
  financeMode: FinanceMode;
  settlementStrategy: SettlementStrategy;
  expenseVisibility: ExpenseVisibility;
  expenseViewerIds: string[];
  modules: TripModules;
  dashboardWidgets: GameplayDashboardWidgetKey[];
  navigation: TripNavigationKey[];
};

export type Feedback = { type: "success" | "error"; text: string } | null;

export type ManagedParticipant = {
  id: string;
  name: string;
  isAdmin: boolean;
  lastSeenAt: string | null;
  userPin: string | null;
  teamId: string | null;
};

export type ManagedTeam = {
  id: string;
  name: string;
  color: string;
  score: number;
};

export type TripSettingsInitialProfile = {
  name: string;
  avatarUrl: string | null;
  phone: string | null;
  revolutUrl: string | null;
  paymentNote: string | null;
};

export type TripSettingsInitialTrip = {
  name: string;
  startDate: string | null;
  endDate: string | null;
  destinationName: string | null;
  destinationAddress: string | null;
  destinationMapUrl: string | null;
  playlistUrl: string | null;
  defaultCurrency: CurrencyCode;
  theme: TripThemeKey;
  financeMode: FinanceMode;
  settlementStrategy: SettlementStrategy;
  expenseVisibility: ExpenseVisibility;
  expenseViewerIds: string[];
  playlists: Array<{ id: string; name: string; url: string }>;
  modules: TripModules;
  dashboardWidgets: GameplayDashboardWidgetKey[];
  navigation: TripNavigationKey[];
  joinPin: string | null;
  inviteToken: string | null;
  financeEntryCount: number;
  status: "active" | "closed";
  closedAt: string | null;
  packingPresets: PackingPresetKey[];
};

export type TripSettingsProps = {
  tripKey: string;
  isAdmin: boolean;
  currentUserId: string;
  initialProfile: TripSettingsInitialProfile;
  initialTrip: TripSettingsInitialTrip;
  participants: ManagedParticipant[];
  teams: ManagedTeam[];
};
