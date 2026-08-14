"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { announceNavigationStart, NAVIGATION_START_EVENT } from "~/lib/navigation-feedback";

const MAX_PENDING_TIME = 15_000;

export function NavigationFeedback() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isNavigating, setIsNavigating] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const timeoutRef = useRef<number | null>(null);
  const locationKey = `${pathname}?${searchParams.toString()}`;

  useEffect(() => {
    setIsNavigating(false);
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, [locationKey]);

  useEffect(() => {
    const updateConnection = () => setIsOnline(navigator.onLine);
    updateConnection();
    window.addEventListener("online", updateConnection);
    window.addEventListener("offline", updateConnection);
    return () => {
      window.removeEventListener("online", updateConnection);
      window.removeEventListener("offline", updateConnection);
    };
  }, []);

  useEffect(() => {
    const start = () => {
      setIsNavigating(true);
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => {
        timeoutRef.current = null;
        setIsNavigating(false);
      }, MAX_PENDING_TIME);
    };

    const handleClick = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const target = event.target instanceof Element ? event.target : null;
      const anchor = target?.closest<HTMLAnchorElement>("a[href]");
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;

      const destination = new URL(anchor.href, window.location.href);
      if (destination.origin !== window.location.origin) return;

      const current = `${window.location.pathname}${window.location.search}`;
      const next = `${destination.pathname}${destination.search}`;
      if (current !== next) {
        window.queueMicrotask(() => announceNavigationStart(next));
      }
    };

    const handlePopState = () => {
      announceNavigationStart(`${window.location.pathname}${window.location.search}`);
    };

    window.addEventListener(NAVIGATION_START_EVENT, start);
    window.addEventListener("popstate", handlePopState);
    document.addEventListener("click", handleClick, true);

    return () => {
      window.removeEventListener(NAVIGATION_START_EVENT, start);
      window.removeEventListener("popstate", handlePopState);
      document.removeEventListener("click", handleClick, true);
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <>
      <AnimatePresence>
        {!isOnline && (
          <motion.p
            role="status"
            aria-live="polite"
            className="bg-theme-danger fixed top-[calc(env(safe-area-inset-top)+0.5rem)] left-1/2 z-100 -translate-x-1/2 rounded-full px-3 py-1.5 text-[10px] font-bold text-white shadow-lg"
            initial={{ y: -12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -12, opacity: 0 }}
          >
            Brak internetu
          </motion.p>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isNavigating && (
          <>
            <motion.div
              className="bg-theme-primary fixed top-[env(safe-area-inset-top)] left-0 z-100 h-0.5 shadow-[0_0_12px_var(--theme-primary)]"
              initial={{ width: "4%", opacity: 0 }}
              animate={{ width: "78%", opacity: 1 }}
              exit={{ width: "100%", opacity: 0 }}
              transition={{
                width: { duration: 8, ease: "easeOut" },
                opacity: { duration: 0.15 },
              }}
            />
            <span className="sr-only" role="status" aria-live="polite">
              Ładowanie widoku
            </span>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
