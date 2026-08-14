export const NAVIGATION_START_EVENT = "wyjezdnik:navigation-start";

export type NavigationStartDetail = {
  href?: string;
};

export function announceNavigationStart(href?: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<NavigationStartDetail>(NAVIGATION_START_EVENT, {
      detail: { href },
    }),
  );
}
