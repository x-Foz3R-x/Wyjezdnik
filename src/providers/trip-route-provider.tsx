"use client";

import { createContext, useContext } from "react";
import type { FinanceMode, SettlementStrategy } from "~/lib/finances";
import type { TripLayoutConfig, TripModules } from "~/lib/trip-config";
import type { CurrencyCode } from "~/lib/currencies";
import type { TripThemeKey } from "~/lib/themes";

export type TripRouteContextValue = {
  tripId: string;
  tripName: string;
  urlKey: string;
  userId: string | null;
  userName: string | null;
  userAvatarUrl: string | null;
  isAdmin: boolean;
  isClosed: boolean;
  theme: TripThemeKey;
  defaultCurrency: CurrencyCode;
  financeMode: FinanceMode;
  settlementStrategy: SettlementStrategy;
  modules: TripModules;
  layout: TripLayoutConfig;
  playlistUrl: string | null;
  playlists: Array<{ id: string; name: string; url: string; sort_order: number }>;
  shareAccess: { inviteToken: string; joinPin: string } | null;
};

const TripRouteContext = createContext<TripRouteContextValue | null>(null);

export function TripRouteProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: TripRouteContextValue;
}) {
  return <TripRouteContext.Provider value={value}>{children}</TripRouteContext.Provider>;
}

export function useTripRoute() {
  const context = useContext(TripRouteContext);
  if (!context) throw new Error("useTripRoute wymaga TripRouteProvider.");
  return context;
}
