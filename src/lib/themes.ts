export const TRIP_THEME_KEYS = ["classic", "bieszczady"] as const;

export type TripThemeKey = (typeof TRIP_THEME_KEYS)[number];

export type TripThemeDefinition = {
  key: TripThemeKey;
  name: string;
  description: string;
  colors: readonly [string, string, string, string];
};

export const DEFAULT_TRIP_THEME: TripThemeKey = "classic";

export const TRIP_THEMES: readonly TripThemeDefinition[] = [
  {
    key: "classic",
    name: "Klasyczny Wyjezdnik",
    description: "Ciepły, nocny motyw z bursztynowym światłem.",
    colors: ["#1a0f00", "#261700", "#ffb44a", "#79b8ff"],
  },
  {
    key: "bieszczady",
    name: "Bieszczady po zmroku",
    description: "Połoniny, świerkowy las, mgła i światło ogniska.",
    colors: ["#0b1915", "#173127", "#d99a4e", "#83b8a0"],
  },
] as const;

export function parseTripTheme(value: unknown): TripThemeKey {
  return TRIP_THEME_KEYS.includes(value as TripThemeKey)
    ? (value as TripThemeKey)
    : DEFAULT_TRIP_THEME;
}
