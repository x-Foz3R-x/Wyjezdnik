"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  DashboardPageLoading,
  FinancesPageLoading,
  GameplayDetailLoading,
  GameplayMenuLoading,
  SchedulePageLoading,
  SettingsPageLoading,
} from "~/components/loading/trip-page-loadings";
import { ShoppingPageLoading } from "~/components/loading/shopping-page-loading";
import { NAVIGATION_START_EVENT, type NavigationStartDetail } from "~/lib/navigation-feedback";
import { useTripRoute } from "~/providers/trip-route-provider";

const MAX_PENDING_TIME = 15_000;

export function TripNavigationTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { urlKey } = useTripRoute();
  const basePath = `/t/${urlKey}`;
  const [pendingPath, setPendingPath] = useState<string | null>(null);

  useEffect(() => {
    setPendingPath(null);
  }, [pathname]);

  useEffect(() => {
    const handleNavigationStart = (event: Event) => {
      const href = (event as CustomEvent<NavigationStartDetail>).detail?.href;
      if (!href) return;

      const destination = new URL(href, window.location.origin);
      if (
        destination.origin !== window.location.origin ||
        !destination.pathname.startsWith(basePath) ||
        destination.pathname === pathname
      ) {
        return;
      }

      setPendingPath(destination.pathname);
    };

    window.addEventListener(NAVIGATION_START_EVENT, handleNavigationStart);
    return () => window.removeEventListener(NAVIGATION_START_EVENT, handleNavigationStart);
  }, [basePath, pathname]);

  useEffect(() => {
    if (!pendingPath) return;
    const timeout = window.setTimeout(() => setPendingPath(null), MAX_PENDING_TIME);
    return () => window.clearTimeout(timeout);
  }, [pendingPath]);

  if (!pendingPath) return children;

  return (
    <div data-instant-route-loading key={pendingPath}>
      <PendingTripPage pathname={pendingPath} basePath={basePath} />
    </div>
  );
}

function PendingTripPage({ pathname, basePath }: { pathname: string; basePath: string }) {
  const suffix = pathname.slice(basePath.length);

  if (suffix === "/schedule") return <SchedulePageLoading />;
  if (suffix === "/shopping") return <ShoppingPageLoading />;
  if (suffix === "/finances") return <FinancesPageLoading />;
  if (suffix === "/settings") return <SettingsPageLoading />;
  if (suffix === "/gameplay/scores") return <GameplayDetailLoading view="scores" />;
  if (suffix === "/gameplay/challenges") return <GameplayDetailLoading view="challenges" />;
  if (suffix === "/gameplay/polls") return <GameplayDetailLoading view="polls" />;
  if (suffix === "/gameplay/wheel") return <GameplayDetailLoading view="wheel" />;
  if (suffix === "/gameplay/minigame") return <GameplayDetailLoading view="minigame" />;
  if (suffix.startsWith("/gameplay")) return <GameplayMenuLoading />;

  return <DashboardPageLoading />;
}
