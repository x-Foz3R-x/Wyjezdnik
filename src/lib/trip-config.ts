import type { Json } from "~/types/database";

export const TRIP_MODULE_KEYS = [
  "schedule",
  "shopping",
  "scoreboard",
  "finances",
  "packing",
  "quests",
] as const;

export type TripModuleKey = (typeof TRIP_MODULE_KEYS)[number];
export type TripModules = Record<TripModuleKey, boolean> & {
  /** Pole zgodności ze starszymi wyjazdami. Playlista nie jest już modułem. */
  playlist: boolean;
};

export const DEFAULT_TRIP_MODULES: TripModules = {
  schedule: false,
  shopping: false,
  scoreboard: false,
  finances: false,
  packing: false,
  quests: false,
  playlist: false,
};

export const TRIP_MODULES = [
  {
    key: "scoreboard",
    name: "Rozrywka",
    shortName: "Rozrywka",
    description: "Wybierz punktację, wyzwania, głosowania lub losowania.",
    href: "/gameplay",
  },
  {
    key: "shopping",
    name: "Lista zakupów",
    shortName: "Zakupy",
    description: "Wspólna lista rzeczy do kupienia.",
    href: "/shopping",
  },
  {
    key: "finances",
    name: "Rozliczenia",
    shortName: "Rozliczenia",
    description: "Wspólne wydatki, podziały kosztów i przelewy.",
    href: "/finances",
  },
  {
    key: "schedule",
    name: "Harmonogram",
    shortName: "Harmonogram",
    description: "Plan tylko wtedy, kiedy naprawdę go potrzebujecie.",
    href: "/schedule",
  },
  {
    key: "packing",
    name: "Pakowanie",
    shortName: "Pakowanie",
    description: "Prywatna lista rzeczy do spakowania.",
    href: "/packing",
  },
  {
    key: "quests",
    name: "Misje",
    shortName: "Misje",
    description: "Wyzwania i zadania dla uczestników.",
    href: "/gameplay/challenges",
  },
] as const satisfies ReadonlyArray<{
  key: TripModuleKey;
  name: string;
  shortName: string;
  description: string;
  href: string | null;
}>;

export const DASHBOARD_WIDGET_KEYS = [
  "destination",
  "dates",
  ...TRIP_MODULE_KEYS,
  "playlist",
  "wheel",
  "polls",
  "participants",
] as const;

export type DashboardWidgetKey = (typeof DASHBOARD_WIDGET_KEYS)[number];

export const GAMEPLAY_DASHBOARD_WIDGET_KEYS = ["scoreboard", "quests", "polls", "wheel"] as const;
export type GameplayDashboardWidgetKey = (typeof GAMEPLAY_DASHBOARD_WIDGET_KEYS)[number];

export const DEFAULT_DASHBOARD_WIDGETS: DashboardWidgetKey[] = ["destination", "dates"];

export const TRIP_NAVIGATION_KEYS = ["scoreboard", "shopping", "finances", "schedule"] as const;
export type TripNavigationKey = (typeof TRIP_NAVIGATION_KEYS)[number];

export const TRIP_WIDGET_KEYS = [
  "destination",
  "trip_dates",
  "playlists",
  "packing_progress",
  "schedule_upcoming",
  "shopping_summary",
  "finance_balance",
  "scoreboard_compact",
  "wheel",
  "active_challenges",
  "polls",
] as const;

export type TripWidgetKey = (typeof TRIP_WIDGET_KEYS)[number];
export type TripSurfaceKey =
  "base" | "schedule" | "shopping" | "finances" | "play" | "scoreboard" | "challenges";

export type TripLayoutConfig = {
  version: 1;
  navigation: TripNavigationKey[];
  surfaces: Partial<Record<TripSurfaceKey, TripWidgetKey[]>>;
};

const LEGACY_WIDGET_MAP: Partial<Record<DashboardWidgetKey, TripWidgetKey>> = {
  destination: "destination",
  dates: "trip_dates",
  schedule: "schedule_upcoming",
  shopping: "shopping_summary",
  scoreboard: "scoreboard_compact",
  finances: "finance_balance",
  packing: "packing_progress",
  quests: "active_challenges",
  playlist: "playlists",
};

export function parseTripLayout(
  value: Json | null | undefined,
  modules: TripModules,
  legacyDashboardWidgets?: Json | null,
): TripLayoutConfig {
  if (value && typeof value === "object" && !Array.isArray(value) && value.version === 1) {
    const configuredNavigation = Array.isArray(value.navigation)
      ? value.navigation
          .filter(
            (key): key is TripNavigationKey =>
              typeof key === "string" && (TRIP_NAVIGATION_KEYS as readonly string[]).includes(key),
          )
          .filter((key) => modules[key])
      : [];
    const legacyNavigation = ["schedule", "shopping", "scoreboard", "finances"].filter(
      (key): key is TripNavigationKey =>
        (TRIP_NAVIGATION_KEYS as readonly string[]).includes(key) &&
        modules[key as TripNavigationKey],
    );
    const isLegacyDefault =
      value.navigation_customized !== true &&
      configuredNavigation.length > 0 &&
      configuredNavigation.every((key, index) => legacyNavigation[index] === key);
    const navigation =
      configuredNavigation.length === 0 || isLegacyDefault
        ? TRIP_NAVIGATION_KEYS.filter((key) => modules[key])
        : configuredNavigation;
    const surfaces: TripLayoutConfig["surfaces"] = {};
    if (value.surfaces && typeof value.surfaces === "object" && !Array.isArray(value.surfaces)) {
      for (const [surface, widgets] of Object.entries(value.surfaces)) {
        if (!Array.isArray(widgets)) continue;
        surfaces[surface as TripSurfaceKey] = widgets.filter(
          (widget): widget is TripWidgetKey =>
            typeof widget === "string" && (TRIP_WIDGET_KEYS as readonly string[]).includes(widget),
        );
      }
    }
    return { version: 1, navigation, surfaces };
  }

  const fallbackNavigation = TRIP_NAVIGATION_KEYS.filter((key) => modules[key]).slice(0, 3);
  const fallbackWidgets = parseDashboardWidgets(legacyDashboardWidgets)
    .map((widget) => LEGACY_WIDGET_MAP[widget])
    .filter((widget): widget is TripWidgetKey => Boolean(widget));

  return {
    version: 1,
    navigation: fallbackNavigation,
    surfaces: { base: fallbackWidgets },
  };
}

export function parseTripModules(value: Json | null | undefined): TripModules {
  const modules = value && typeof value === "object" && !Array.isArray(value) ? value : {};

  return {
    schedule: modules.schedule !== false,
    shopping: modules.shopping !== false,
    scoreboard: modules.scoreboard === true,
    finances: modules.finances !== false,
    packing: modules.packing !== false,
    quests: modules.quests === true,
    playlist: modules.playlist === true,
  };
}

export function parseDashboardWidgets(value: Json | null | undefined): DashboardWidgetKey[] {
  if (!Array.isArray(value)) return DEFAULT_DASHBOARD_WIDGETS;

  const allowed = new Set<string>(DASHBOARD_WIDGET_KEYS);
  return value.filter(
    (widget): widget is DashboardWidgetKey => typeof widget === "string" && allowed.has(widget),
  );
}

export function parseGameplayDashboardWidgets(
  value: Json | null | undefined,
  layoutConfig: Json | null | undefined,
  modules: TripModules,
): GameplayDashboardWidgetKey[] {
  if (!modules.scoreboard) return [];

  const configured = parseDashboardWidgets(value).filter(
    (widget): widget is GameplayDashboardWidgetKey =>
      (GAMEPLAY_DASHBOARD_WIDGET_KEYS as readonly string[]).includes(widget),
  );
  const isCustomized =
    layoutConfig &&
    typeof layoutConfig === "object" &&
    !Array.isArray(layoutConfig) &&
    layoutConfig.gameplay_widgets_customized === true;

  return isCustomized ? configured : configured.length > 0 ? configured : ["scoreboard"];
}

export function getAutomaticDashboardWidgets({
  modules,
  hasDestination,
  hasPlaylists,
  gameplayWidgets = [],
}: {
  modules: TripModules;
  hasDestination: boolean;
  hasPlaylists: boolean;
  gameplayWidgets?: GameplayDashboardWidgetKey[];
}): DashboardWidgetKey[] {
  return [
    ...(hasDestination ? (["destination"] as const) : []),
    ...(modules.schedule ? (["schedule"] as const) : []),
    ...(modules.shopping ? (["shopping"] as const) : []),
    ...(modules.finances ? (["finances"] as const) : []),
    ...gameplayWidgets,
    ...(hasPlaylists ? (["playlist"] as const) : []),
    "packing",
    "participants",
  ];
}
