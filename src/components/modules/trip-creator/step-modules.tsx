import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Backpack,
  CalendarDays,
  Check,
  ChevronDown,
  Dices,
  Flag,
  Music2,
  ReceiptText,
  ShoppingBasket,
  SlidersHorizontal,
  Sparkles,
  Trophy,
  Vote,
  type LucideIcon,
} from "lucide-react";
import {
  GAMEPLAY_DASHBOARD_WIDGET_KEYS,
  TRIP_MODULES,
  type DashboardWidgetKey,
  type GameplayDashboardWidgetKey,
  type TripModuleKey,
} from "~/lib/trip-config";
import { cn } from "~/lib/utils";
import type { TripFormData } from "./index";
import { PACKING_PRESETS, type PackingPresetKey } from "~/lib/packing";

interface Props {
  data: TripFormData;
  setData: React.Dispatch<React.SetStateAction<TripFormData>>;
  onNext: () => void;
  onBack: () => void;
}

export function StepModules({ data, setData, onNext, onBack }: Props) {
  const icons: Record<TripModuleKey, LucideIcon> = {
    schedule: CalendarDays,
    shopping: ShoppingBasket,
    scoreboard: Trophy,
    finances: ReceiptText,
    packing: Backpack,
    quests: Sparkles,
  };

  const gameplayOptions: Array<{
    key: GameplayDashboardWidgetKey;
    label: string;
    description: string;
    icon: LucideIcon;
  }> = [
    { key: "scoreboard", label: "Punktacja", description: "Drużyny i wyniki", icon: Trophy },
    { key: "quests", label: "Wyzwania", description: "Zadania dla ekipy", icon: Flag },
    { key: "polls", label: "Głosowania", description: "Wspólne decyzje", icon: Vote },
    { key: "wheel", label: "Koło", description: "Losowanie osoby", icon: Dices },
  ];

  const toggle = (key: TripModuleKey) => {
    const enabled = !data.modules[key];
    const dashboardWidgets: DashboardWidgetKey[] =
      key === "scoreboard"
        ? enabled
          ? data.dashboardWidgets.some((widget) =>
              (GAMEPLAY_DASHBOARD_WIDGET_KEYS as readonly string[]).includes(widget),
            )
            ? data.dashboardWidgets
            : [...data.dashboardWidgets, "scoreboard" as const]
          : data.dashboardWidgets.filter(
              (widget) => !(GAMEPLAY_DASHBOARD_WIDGET_KEYS as readonly string[]).includes(widget),
            )
        : enabled
          ? data.dashboardWidgets.includes(key)
            ? data.dashboardWidgets
            : [...data.dashboardWidgets, key]
          : data.dashboardWidgets.filter((widget) => widget !== key);

    setData({
      ...data,
      modules: {
        ...data.modules,
        [key]: enabled,
        ...(key === "scoreboard" ? { quests: enabled } : {}),
      },
      dashboardWidgets,
      ...(key === "scoreboard" && !enabled ? { teams: [], memberAssignments: {} } : {}),
    });
  };

  const toggleGameplay = (key: GameplayDashboardWidgetKey) => {
    const active = data.dashboardWidgets.filter((widget): widget is GameplayDashboardWidgetKey =>
      (GAMEPLAY_DASHBOARD_WIDGET_KEYS as readonly string[]).includes(widget),
    );
    const enabled = active.includes(key);
    if (enabled && active.length === 1) return;

    const dashboardWidgets = enabled
      ? data.dashboardWidgets.filter((widget) => widget !== key)
      : [...data.dashboardWidgets, key];

    setData({
      ...data,
      dashboardWidgets,
      modules: { ...data.modules, quests: dashboardWidgets.includes("quests") },
      ...(key === "scoreboard" && enabled ? { teams: [], memberAssignments: {} } : {}),
    });
  };

  const togglePackingPreset = (key: PackingPresetKey) => {
    const enabled = data.packingPresets.includes(key);
    setData({
      ...data,
      packingPresets: enabled
        ? data.packingPresets.filter((preset) => preset !== key)
        : [...data.packingPresets, key],
    });
  };

  const enabledModuleNames = TRIP_MODULES.filter(
    (module) => module.key !== "quests" && data.modules[module.key],
  ).map((module) => module.shortName);
  const hasCustomSetup =
    data.modules.schedule ||
    data.modules.scoreboard ||
    !data.modules.shopping ||
    !data.modules.finances ||
    !data.modules.packing ||
    Boolean(data.playlistUrl) ||
    data.packingPresets.some((preset) => preset !== "essentials");
  const [isCustomizationOpen, setIsCustomizationOpen] = useState(hasCustomSetup);

  return (
    <div className="animate-fade-in flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <span className="text-theme-primary text-xs font-bold tracking-widest uppercase">
          Zbuduj swój wyjazd
        </span>
        <h2 className="font-heading text-theme-text text-4xl leading-tight font-semibold">
          Co będzie wam potrzebne?
        </h2>
        <p className="text-theme-muted text-sm">
          Wszystko jest opcjonalne. Układ Bazy i dodatki dopasujesz już po utworzeniu wyjazdu.
        </p>
      </div>

      <section className="border-theme-primary/25 bg-theme-primary/8 flex items-start gap-3 rounded-2xl border p-4">
        <span className="bg-theme-primary text-theme-primary-foreground flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
          <Check size={19} strokeWidth={3} />
        </span>
        <div className="min-w-0">
          <h3 className="text-theme-text text-sm font-bold">Gotowy zestaw startowy</h3>
          <p className="text-theme-muted mt-1 text-xs leading-relaxed">
            {enabledModuleNames.length > 0
              ? enabledModuleNames.join(" · ")
              : "Sam wyjazd bez dodatkowych funkcji"}
          </p>
        </div>
      </section>

      <details
        className="bg-theme-card/70 border-theme-border group overflow-hidden rounded-2xl border"
        open={isCustomizationOpen}
        onToggle={(event) => setIsCustomizationOpen(event.currentTarget.open)}
      >
        <summary className="flex min-h-18 cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
          <span className="bg-theme-primary/10 text-theme-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
            <SlidersHorizontal size={18} />
          </span>
          <span className="min-w-0 flex-1">
            <strong className="text-theme-text block text-sm">Dostosuj funkcje</strong>
            <span className="text-theme-muted mt-0.5 block text-xs">
              Moduły, Rozrywka, pakowanie i playlista
            </span>
          </span>
          <ChevronDown
            className="text-theme-muted shrink-0 transition group-open:rotate-180"
            size={18}
          />
        </summary>

        <div className="border-theme-border flex flex-col gap-5 border-t p-4">
          <div className="grid grid-cols-2 gap-3">
            {TRIP_MODULES.filter(
              (module) => module.key !== "quests" && module.key !== "packing",
            ).map((module) => {
              const Icon = icons[module.key];
              const enabled = data.modules[module.key];
              return (
                <button
                  key={module.key}
                  type="button"
                  onClick={() => toggle(module.key)}
                  className={cn(
                    "relative flex min-h-36 flex-col items-start gap-3 rounded-2xl border p-4 text-left transition-all active:scale-98",
                    enabled
                      ? "border-theme-primary/50 bg-theme-primary/10"
                      : "bg-theme-card/70 border-theme-border",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-xl",
                      enabled
                        ? "bg-theme-primary text-theme-primary-foreground"
                        : "bg-theme-card-raised text-theme-muted",
                    )}
                  >
                    <Icon size={19} />
                  </span>
                  <span className="flex flex-col gap-1">
                    <strong className="text-theme-text text-sm">{module.name}</strong>
                    <span className="text-theme-muted text-xs leading-snug">
                      {module.description}
                    </span>
                  </span>
                  {enabled && (
                    <span className="bg-theme-primary text-theme-primary-foreground absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full">
                      <Check size={13} strokeWidth={3} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {data.modules.scoreboard && (
            <div className="flex flex-col gap-3">
              <div>
                <h3 className="text-theme-text text-sm font-bold">Co ma być w Rozrywce?</h3>
                <p className="text-theme-muted mt-1 text-xs">
                  Drużyny są potrzebne tylko wtedy, gdy włączysz Punktację.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {gameplayOptions.map(({ key, label, description, icon: Icon }) => {
                  const enabled = data.dashboardWidgets.includes(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleGameplay(key)}
                      className={cn(
                        "flex min-h-20 items-center gap-3 rounded-xl border px-3 text-left transition",
                        enabled
                          ? "border-theme-primary/45 bg-theme-primary/10"
                          : "border-theme-border bg-theme-card/55",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-9 shrink-0 items-center justify-center rounded-xl",
                          enabled
                            ? "bg-theme-primary text-theme-primary-foreground"
                            : "text-theme-muted",
                        )}
                      >
                        <Icon size={16} />
                      </span>
                      <span className="min-w-0">
                        <strong className="text-theme-text block text-xs">{label}</strong>
                        <span className="text-theme-muted mt-0.5 block text-[10px]">
                          {description}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {data.modules.packing && (
            <div className="flex flex-col gap-3">
              <div>
                <h3 className="text-theme-text text-sm font-bold">Co warto spakować?</h3>
                <p className="text-theme-muted mt-1 text-xs">
                  Każdy uczestnik dostanie prywatną listę z wybranych zestawów.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {PACKING_PRESETS.map((preset) => {
                  const enabled = data.packingPresets.includes(preset.key);
                  return (
                    <button
                      key={preset.key}
                      type="button"
                      onClick={() => togglePackingPreset(preset.key)}
                      className={cn(
                        "relative flex min-h-24 flex-col items-start rounded-xl border p-3 text-left transition active:scale-98",
                        enabled
                          ? "border-theme-primary/45 bg-theme-primary/10"
                          : "border-theme-border bg-theme-card/55",
                      )}
                    >
                      <strong className="text-theme-text pr-5 text-xs">{preset.name}</strong>
                      <span className="text-theme-muted mt-1 text-[10px] leading-snug">
                        {preset.description}
                      </span>
                      {enabled && (
                        <Check className="text-theme-primary absolute top-3 right-3" size={14} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Music2 className="text-theme-primary" size={17} />
              <h3 className="text-theme-text text-sm font-bold">Playlista (opcjonalnie)</h3>
            </div>
            <Input
              type="url"
              label="Link do pierwszej playlisty"
              value={data.playlistUrl}
              onChange={(event) => setData({ ...data, playlistUrl: event.target.value })}
              placeholder="YouTube Music, Spotify…"
            />
            <p className="text-theme-muted text-[10px]">
              Jeśli dodasz link, playlista automatycznie pojawi się w Bazie i w „Więcej”.
            </p>
          </div>
        </div>
      </details>

      <div className="mt-4 flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Wróć
        </Button>
        <Button onClick={onNext} className="flex-1">
          Dalej
        </Button>
      </div>
    </div>
  );
}
