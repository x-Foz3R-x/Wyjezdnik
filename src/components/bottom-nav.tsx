"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarDays,
  Gamepad2,
  Home,
  Menu,
  ReceiptText,
  ShoppingBasket,
  type LucideIcon,
} from "lucide-react";
import { motion } from "framer-motion";
import { ResponsiveDialog } from "~/components/ui/responsive-dialog";
import { MoreMenu } from "~/components/more-menu";
import { MOTION_TRANSITIONS } from "~/lib/motion";
import { announceNavigationStart } from "~/lib/navigation-feedback";
import type { TripNavigationKey } from "~/lib/trip-config";
import { cn } from "~/lib/utils";
import { useTripRoute } from "~/providers/trip-route-provider";

type NavigationItem = {
  name: string;
  suffix: string;
  icon: LucideIcon;
  isMore?: boolean;
};

type SurfaceTone = "light" | "dark";

const MODULE_NAV_ITEMS: Record<TripNavigationKey, NavigationItem> = {
  schedule: { name: "Plan", suffix: "/schedule", icon: CalendarDays },
  shopping: { name: "Zakupy", suffix: "/shopping", icon: ShoppingBasket },
  scoreboard: { name: "Rozrywka", suffix: "/gameplay", icon: Gamepad2 },
  finances: { name: "Rozliczenia", suffix: "/finances", icon: ReceiptText },
};

function colorTone(color: string): SurfaceTone | null {
  const channels = color.match(/[\d.]+/g)?.map(Number);
  if (!channels || channels.length < 3 || (channels[3] ?? 1) < 0.15) return null;

  const [red = 0, green = 0, blue = 0] = channels;
  const luminance = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
  return luminance > 0.55 ? "light" : "dark";
}

function surfaceToneAt(nav: HTMLElement, x: number, y: number): SurfaceTone | null {
  for (const element of document.elementsFromPoint(x, y)) {
    if (nav.contains(element)) continue;

    const declaredSurface = element.closest<HTMLElement>("[data-bottom-nav-tone]");
    const declaredTone = declaredSurface?.dataset.bottomNavTone;
    if (declaredTone === "light" || declaredTone === "dark") return declaredTone;

    let current: Element | null = element;
    while (current && current !== document.documentElement) {
      const tone = colorTone(window.getComputedStyle(current).backgroundColor);
      if (tone) return tone;
      current = current.parentElement;
    }
  }

  return null;
}

function declaredSurfaceToneUnder(nav: HTMLElement, navBounds: DOMRect): SurfaceTone | null {
  let lightArea = 0;
  let darkArea = 0;

  for (const surface of document.querySelectorAll<HTMLElement>("[data-bottom-nav-tone]")) {
    if (nav.contains(surface)) continue;

    const bounds = surface.getBoundingClientRect();
    const overlapWidth = Math.max(
      0,
      Math.min(navBounds.right, bounds.right) - Math.max(navBounds.left, bounds.left),
    );
    const overlapHeight = Math.max(
      0,
      Math.min(navBounds.bottom, bounds.bottom) - Math.max(navBounds.top, bounds.top),
    );
    const overlapArea = overlapWidth * overlapHeight;

    if (surface.dataset.bottomNavTone === "light") lightArea += overlapArea;
    if (surface.dataset.bottomNavTone === "dark") darkArea += overlapArea;
  }

  const coveredArea = lightArea + darkArea;
  const navArea = navBounds.width * navBounds.height;
  if (coveredArea < navArea * 0.2) return null;
  return lightArea > darkArea ? "light" : "dark";
}

export function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { layout, urlKey } = useTripRoute();
  const basePath = `/t/${urlKey}`;
  const navRef = useRef<HTMLDivElement>(null);
  const pointerIdRef = useRef<number | null>(null);
  const suppressClickRef = useRef(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLightSurface, setIsLightSurface] = useState(false);
  const [optimisticIndex, setOptimisticIndex] = useState<number | null>(null);

  const navItems = useMemo<NavigationItem[]>(() => {
    const primaryItems = layout.navigation.slice(0, 3).map((key) => MODULE_NAV_ITEMS[key]);
    return [
      { name: "Baza", suffix: "", icon: Home },
      ...primaryItems,
      { name: "Więcej", suffix: "/more", icon: Menu, isMore: true },
    ];
  }, [layout.navigation]);
  const moreIsActive =
    pathname === `${basePath}/more` ||
    pathname === `${basePath}/settings` ||
    pathname === `${basePath}/packing`;
  const routeIndex = navItems.findIndex((item) => {
    if (item.isMore) return false;
    const href = `${basePath}${item.suffix}`;
    return item.suffix === ""
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`);
  });
  const restingIndex = isMoreOpen || moreIsActive ? navItems.length - 1 : Math.max(routeIndex, 0);
  const selectedIndex = dragIndex ?? optimisticIndex ?? restingIndex;

  useEffect(() => {
    for (const item of navItems) {
      if (!item.isMore) router.prefetch(`${basePath}${item.suffix}`);
    }
  }, [basePath, navItems, router]);

  useEffect(() => {
    setOptimisticIndex(null);
  }, [pathname]);

  useEffect(() => {
    let frame: number | null = null;
    let settleTimer: number | null = null;

    const updateSurfaceTone = () => {
      frame = null;
      const nav = navRef.current;
      if (!nav) return;

      const bounds = nav.getBoundingClientRect();
      const declaredTone = declaredSurfaceToneUnder(nav, bounds);
      if (declaredTone) {
        setIsLightSurface(declaredTone === "light");
        return;
      }

      const y = Math.min(window.innerHeight - 1, bounds.top + bounds.height / 2);
      const tones = [0.1, 0.3, 0.5, 0.7, 0.9]
        .map((position) => surfaceToneAt(nav, bounds.left + bounds.width * position, y))
        .filter((tone): tone is SurfaceTone => tone !== null);
      const lightSamples = tones.filter((tone) => tone === "light").length;

      setIsLightSurface(tones.length > 0 && lightSamples > tones.length / 2);
    };

    const scheduleUpdate = () => {
      if (frame === null) frame = window.requestAnimationFrame(updateSurfaceTone);

      if (settleTimer !== null) window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(() => {
        settleTimer = null;
        if (frame === null) frame = window.requestAnimationFrame(updateSurfaceTone);
      }, 100);
    };

    scheduleUpdate();
    window.addEventListener("scroll", scheduleUpdate, { capture: true, passive: true });
    window.addEventListener("resize", scheduleUpdate, { passive: true });
    window.addEventListener("touchmove", scheduleUpdate, { passive: true });
    window.addEventListener("wheel", scheduleUpdate, { passive: true });
    document.addEventListener("scroll", scheduleUpdate, { capture: true, passive: true });
    window.visualViewport?.addEventListener("scroll", scheduleUpdate, { passive: true });

    const resizeObserver = new ResizeObserver(scheduleUpdate);
    if (navRef.current) resizeObserver.observe(navRef.current);

    const mutationObserver = new MutationObserver(scheduleUpdate);
    mutationObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ["data-bottom-nav-tone"],
      childList: true,
      subtree: true,
    });

    return () => {
      if (frame !== null) window.cancelAnimationFrame(frame);
      if (settleTimer !== null) window.clearTimeout(settleTimer);
      window.removeEventListener("scroll", scheduleUpdate, true);
      window.removeEventListener("resize", scheduleUpdate);
      window.removeEventListener("touchmove", scheduleUpdate);
      window.removeEventListener("wheel", scheduleUpdate);
      document.removeEventListener("scroll", scheduleUpdate, true);
      window.visualViewport?.removeEventListener("scroll", scheduleUpdate);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [pathname]);

  const indexAt = (clientX: number) => {
    const bounds = navRef.current?.getBoundingClientRect();
    if (!bounds) return restingIndex;
    const relative = Math.max(0, Math.min(clientX - bounds.left, bounds.width - 1));
    return Math.floor((relative / bounds.width) * navItems.length);
  };

  const openItem = (index: number) => {
    const item = navItems[index];
    if (!item) return;

    if (item.isMore) {
      setOptimisticIndex(null);
      setIsMoreOpen(true);
      return;
    }

    const href = `${basePath}${item.suffix}`;
    if (href === pathname) {
      setOptimisticIndex(null);
      return;
    }
    setOptimisticIndex(index);
    announceNavigationStart(href);
    router.push(href);
  };

  const finishDrag = () => {
    pointerIdRef.current = null;
    setIsDragging(false);
    setDragIndex(null);
  };

  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-50 px-2">
      <div
        ref={navRef}
        onPointerDown={(event) => {
          if (event.pointerType === "mouse" && event.button !== 0) return;
          pointerIdRef.current = event.pointerId;
          event.currentTarget.setPointerCapture(event.pointerId);
          setIsDragging(true);
          setDragIndex(indexAt(event.clientX));
        }}
        onPointerMove={(event) => {
          if (pointerIdRef.current !== event.pointerId) return;
          setDragIndex(indexAt(event.clientX));
        }}
        onPointerUp={(event) => {
          if (pointerIdRef.current !== event.pointerId) return;
          const targetIndex = indexAt(event.clientX);
          suppressClickRef.current = true;
          finishDrag();
          openItem(targetIndex);
          window.setTimeout(() => {
            suppressClickRef.current = false;
          }, 0);
        }}
        onPointerCancel={() => finishDrag()}
        className={cn(
          "pointer-events-auto relative mx-auto grid max-w-110 touch-pan-y items-center rounded-full border p-1 backdrop-blur-2xl transition-colors duration-300 select-none",
          isDragging && "cursor-grabbing",
          isLightSurface
            ? "border-black/10 bg-white/90 shadow-[0_16px_44px_rgba(45,36,24,0.18)] supports-backdrop-filter:bg-white/78"
            : "bg-theme-card/72 border-theme-border/80 supports-backdrop-filter:bg-theme-card/58 shadow-[0_18px_52px_rgba(0,0,0,0.4)]",
        )}
        style={{ gridTemplateColumns: `repeat(${navItems.length}, minmax(0, 1fr))` }}
        aria-label="Nawigacja wyjazdu"
      >
        <motion.span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-y-1 left-1 z-0 rounded-full transition-colors duration-300",
            isLightSurface
              ? "bg-brand-accent-strong/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_4px_16px_rgba(45,36,24,0.08)]"
              : "bg-theme-primary/12 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_4px_16px_rgba(0,0,0,0.12)]",
          )}
          style={{ width: `calc((100% - 0.5rem) / ${navItems.length})` }}
          animate={{
            x: `${selectedIndex * 100}%`,
            scale: isDragging ? 0.94 : 1,
          }}
          transition={isDragging ? MOTION_TRANSITIONS.quick : MOTION_TRANSITIONS.spring}
        />

        {navItems.map((item, index) => {
          const isSelected = selectedIndex === index;
          const Icon = item.icon;

          return (
            <button
              key={`${item.suffix}:${item.name}`}
              type="button"
              aria-current={index === restingIndex ? "page" : undefined}
              aria-expanded={item.isMore ? isMoreOpen : undefined}
              aria-label={item.isMore ? "Otwórz Więcej" : `Przejdź do: ${item.name}`}
              onClick={() => {
                if (suppressClickRef.current) return;
                openItem(index);
              }}
              className={cn(
                "relative z-10 flex min-h-14 min-w-0 flex-col items-center justify-center gap-0.5 rounded-full px-1 transition-colors",
                isSelected
                  ? isLightSurface
                    ? "text-brand-accent-strong"
                    : "text-theme-primary"
                  : isLightSurface
                    ? "text-black/55 hover:text-black/80"
                    : "text-theme-muted hover:text-theme-text",
              )}
            >
              <motion.span
                animate={{ scale: isSelected && isDragging ? 1.08 : 1 }}
                transition={MOTION_TRANSITIONS.quick}
                className="flex h-6 items-center justify-center"
              >
                <Icon className="size-5.5" strokeWidth={isSelected ? 2.5 : 2} />
              </motion.span>
              <span
                className={cn(
                  "max-w-full truncate text-[9px] tracking-normal",
                  isSelected ? "font-bold" : "font-medium",
                )}
              >
                {item.name}
              </span>
            </button>
          );
        })}
      </div>

      <ResponsiveDialog isOpen={isMoreOpen} setIsOpen={setIsMoreOpen}>
        <MoreMenu key={isMoreOpen ? "open" : "closed"} onNavigate={() => setIsMoreOpen(false)} />
      </ResponsiveDialog>
    </nav>
  );
}
