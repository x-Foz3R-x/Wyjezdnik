"use client";

import {
  ArrowDown,
  ArrowUp,
  Backpack,
  CalendarDays,
  Check,
  Dices,
  LayoutGrid,
  ReceiptText,
  ShoppingBasket,
  Sparkles,
  Trophy,
  Vote,
  type LucideIcon,
} from "lucide-react";
import {
  FeedbackBanner,
  SaveButton,
  SettingsCard,
  SettingsDisclosure,
  SettingsHeader,
  SettingsPage,
} from "~/components/modules/settings/settings-layout";
import type { Feedback, TripSettingsState } from "~/components/modules/settings/settings-types";
import {
  TRIP_MODULES,
  type GameplayDashboardWidgetKey,
  type TripModuleKey,
  type TripNavigationKey,
} from "~/lib/trip-config";
import { cn } from "~/lib/utils";

const MODULE_ICONS: Record<TripModuleKey, LucideIcon> = {
  schedule: CalendarDays,
  shopping: ShoppingBasket,
  scoreboard: Trophy,
  finances: ReceiptText,
  packing: Backpack,
  quests: Sparkles,
};

const GAMEPLAY_WIDGETS: Array<{
  key: GameplayDashboardWidgetKey;
  label: string;
  description: string;
  icon: LucideIcon;
}> = [
  { key: "scoreboard", label: "Punktacja", description: "Wyniki i drużyny.", icon: Trophy },
  {
    key: "quests",
    label: "Wyzwania",
    description: "Zadania dla osób lub drużyn.",
    icon: Sparkles,
  },
  { key: "polls", label: "Głosowania", description: "Wspólne decyzje ekipy.", icon: Vote },
  { key: "wheel", label: "Koło fortuny", description: "Losowanie jednej z osób.", icon: Dices },
];

export function ModulesSettingsView({
  view,
  form,
  feedback,
  isSaving,
  navigationOrder,
  closeView,
  toggleModule,
  moveNavigation,
  toggleWidget,
  saveTrip,
}: {
  view: "modules" | "widgets";
  form: TripSettingsState;
  feedback: Feedback;
  isSaving: boolean;
  navigationOrder: TripNavigationKey[];
  closeView: () => void;
  toggleModule: (key: TripModuleKey) => void;
  moveNavigation: (index: number, direction: -1 | 1) => void;
  toggleWidget: (key: GameplayDashboardWidgetKey) => void;
  saveTrip: () => Promise<void>;
}) {
  if (view === "modules") {
    return (
      <SettingsPage>
        <SettingsHeader title="Moduły i nawigacja" onBack={closeView} />
        <FeedbackBanner feedback={feedback} />
        <SettingsCard title="Aktywne moduły" icon={Sparkles}>
          <div className="grid grid-cols-2 gap-2">
            {TRIP_MODULES.filter(
              (module) => module.key !== "quests" && module.key !== "packing",
            ).map((module) => {
              const Icon = MODULE_ICONS[module.key];
              const enabled =
                module.key === "scoreboard"
                  ? form.modules.scoreboard || form.modules.quests
                  : form.modules[module.key];
              return (
                <button
                  key={module.key}
                  type="button"
                  onClick={() => toggleModule(module.key)}
                  className={cn(
                    "relative flex min-h-24 flex-col items-start justify-between rounded-xl border p-3 text-left",
                    enabled
                      ? "border-theme-primary/40 bg-theme-primary/10"
                      : "border-theme-border bg-theme-bg/30",
                  )}
                >
                  <Icon className={enabled ? "text-theme-primary" : "text-theme-muted"} size={18} />
                  <span className="text-theme-text pr-5 text-xs font-bold">{module.name}</span>
                  {enabled && (
                    <Check className="text-theme-primary absolute top-2 right-2" size={15} />
                  )}
                </button>
              );
            })}
          </div>
        </SettingsCard>

        <SettingsDisclosure
          title="Kolejność nawigacji"
          description="Opcjonalnie ustaw kolejność dolnego paska"
          icon={LayoutGrid}
        >
          <p className="text-theme-muted text-xs">
            Pierwsze trzy aktywne moduły trafiają na dolny pasek. Pozostałe są zawsze dostępne w
            „Więcej”.
          </p>
          {navigationOrder.length === 0 ? (
            <p className="border-theme-border text-theme-muted rounded-xl border border-dashed p-4 text-center text-xs">
              Włącz Zakupy, Rozrywkę, Rozliczenia lub Harmonogram.
            </p>
          ) : (
            <div className="border-theme-border divide-theme-border divide-y overflow-hidden rounded-xl border">
              {navigationOrder.map((key, index) => {
                const tripModule = TRIP_MODULES.find((item) => item.key === key);
                const Icon = MODULE_ICONS[key];
                return (
                  <div key={key} className="flex min-h-16 items-center gap-3 px-3 py-2">
                    <span className="bg-theme-primary/10 text-theme-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
                      <Icon size={17} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="text-theme-text block truncate text-sm font-bold">
                        {tripModule?.shortName ?? key}
                      </span>
                      <span className="text-theme-muted block text-[10px]">
                        {index < 3 ? `Pozycja ${index + 1} na pasku` : "Dostępny w Więcej"}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => moveNavigation(index, -1)}
                      disabled={index === 0}
                      className="text-theme-muted flex h-10 w-10 items-center justify-center disabled:opacity-25"
                      aria-label={`Przesuń ${tripModule?.shortName ?? key} wyżej`}
                    >
                      <ArrowUp size={17} />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveNavigation(index, 1)}
                      disabled={index === navigationOrder.length - 1}
                      className="text-theme-muted flex h-10 w-10 items-center justify-center disabled:opacity-25"
                      aria-label={`Przesuń ${tripModule?.shortName ?? key} niżej`}
                    >
                      <ArrowDown size={17} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </SettingsDisclosure>
        <SaveButton isSaving={isSaving} onClick={() => void saveTrip()} />
      </SettingsPage>
    );
  }

  if (view === "widgets") {
    return (
      <SettingsPage>
        <SettingsHeader title="Elementy Rozrywki" onBack={closeView} />
        <FeedbackBanner feedback={feedback} />
        <p className="text-theme-muted text-sm">
          Wybierz funkcje dostępne w całej Rozrywce. Ich skróty pojawią się też automatycznie w
          Bazie.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {GAMEPLAY_WIDGETS.map(({ key, label, icon: Icon, description }) => {
            const visible = form.dashboardWidgets.includes(key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggleWidget(key)}
                className={cn(
                  "relative flex min-h-28 flex-col items-start justify-between rounded-xl border p-3 text-left",
                  visible
                    ? "border-theme-primary/40 bg-theme-primary/10"
                    : "border-theme-border bg-theme-card",
                )}
              >
                <span className="bg-theme-primary/10 text-theme-primary flex h-9 w-9 items-center justify-center rounded-xl">
                  <Icon size={16} />
                </span>
                <span className="mt-3 pr-4">
                  <span className="text-theme-text block text-xs font-bold">{label}</span>
                  <span className="text-theme-muted mt-0.5 block text-[10px] leading-snug">
                    {description}
                  </span>
                </span>
                {visible && (
                  <Check className="text-theme-primary absolute right-3 bottom-3" size={14} />
                )}
              </button>
            );
          })}
        </div>
        <SaveButton isSaving={isSaving} onClick={() => void saveTrip()} />
      </SettingsPage>
    );
  }

  return null;
}
