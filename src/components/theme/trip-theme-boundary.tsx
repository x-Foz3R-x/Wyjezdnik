"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import type { TripThemeKey } from "~/lib/themes";

export function TripThemeBoundary({
  theme,
  children,
}: {
  theme: TripThemeKey;
  children: ReactNode;
}) {
  useEffect(() => {
    const previousTheme = document.documentElement.dataset.tripTheme;
    document.documentElement.dataset.tripTheme = theme;

    return () => {
      if (previousTheme) document.documentElement.dataset.tripTheme = previousTheme;
      else delete document.documentElement.dataset.tripTheme;
    };
  }, [theme]);

  return (
    <div className="trip-theme-shell min-h-dvh" data-trip-theme={theme}>
      <div className="trip-theme-content relative z-10 min-h-dvh">{children}</div>
    </div>
  );
}
