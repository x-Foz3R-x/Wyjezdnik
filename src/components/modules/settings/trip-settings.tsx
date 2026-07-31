"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { format, parseISO } from "date-fns";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Backpack,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  Copy,
  Dices,
  Eye,
  EyeOff,
  KeyRound,
  LayoutGrid,
  LockKeyhole,
  MapPin,
  Music2,
  PackageCheck,
  Pencil,
  Plus,
  ReceiptText,
  RotateCcw,
  Save,
  Settings2,
  Share2,
  ShoppingBasket,
  Sparkles,
  Trash2,
  Trophy,
  UserRound,
  UsersRound,
  Vote,
  type LucideIcon,
} from "lucide-react";
import {
  addParticipantAction,
  addTeamAction,
  deleteParticipantAction,
  deleteTripPermanentlyAction,
  deleteTeamAction,
  updateParticipantAction,
  updateParticipantProfileAction,
  setTripStatusAction,
  updateTeamAction,
  updateTripSettingsAction,
} from "~/app/actions/trips";
import { updatePackingPresetsAction } from "~/app/actions/packing";
import { Avatar } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { DateRangePicker } from "~/components/date-range-picker";
import { ResponsiveDialog } from "~/components/responsive-dialog";
import { PlaylistSettings } from "~/components/modules/settings/playlist-settings";
import {
  getFinanceModeLabel,
  getSettlementStrategyLabel,
  type FinanceMode,
  type SettlementStrategy,
} from "~/lib/finances";
import {
  TRIP_MODULES,
  TRIP_NAVIGATION_KEYS,
  type GameplayDashboardWidgetKey,
  type TripModuleKey,
  type TripModules,
  type TripNavigationKey,
} from "~/lib/trip-config";
import { cn } from "~/lib/utils";
import { PACKING_PRESETS, type PackingPresetKey } from "~/lib/packing";
import { CURRENCIES, type CurrencyCode } from "~/lib/currencies";
import type { ExpenseVisibility } from "~/lib/expense-visibility";
import { runClientAction } from "~/lib/client-action";
import { announceNavigationStart } from "~/lib/navigation-feedback";
import { forgetSavedTrip } from "~/lib/saved-trips";
import { LocalProfileSettings } from "~/components/profile/local-profile-settings";

type SettingsView =
  | "menu"
  | "profile"
  | "details"
  | "modules"
  | "widgets"
  | "finances"
  | "packing"
  | "playlists"
  | "participants"
  | "lifecycle";

const SETTINGS_VIEWS: readonly SettingsView[] = [
  "menu",
  "profile",
  "details",
  "modules",
  "widgets",
  "finances",
  "packing",
  "playlists",
  "participants",
  "lifecycle",
];

type TripSettingsState = {
  name: string;
  startDate: string;
  endDate: string;
  destinationName: string;
  destinationAddress: string;
  destinationMapUrl: string;
  playlistUrl: string;
  defaultCurrency: CurrencyCode;
  financeMode: FinanceMode;
  settlementStrategy: SettlementStrategy;
  expenseVisibility: ExpenseVisibility;
  expenseViewerIds: string[];
  modules: TripModules;
  dashboardWidgets: GameplayDashboardWidgetKey[];
  navigation: TripNavigationKey[];
};

type Feedback = { type: "success" | "error"; text: string } | null;
type ManagedParticipant = {
  id: string;
  name: string;
  isAdmin: boolean;
  lastSeenAt: string | null;
  userPin: string | null;
  teamId: string | null;
};

type ManagedTeam = {
  id: string;
  name: string;
  color: string;
  score: number;
};

const ICONS: Record<TripModuleKey, LucideIcon> = {
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
  {
    key: "scoreboard",
    label: "Punktacja",
    description: "Wyniki i drużyny.",
    icon: Trophy,
  },
  {
    key: "quests",
    label: "Wyzwania",
    description: "Zadania dla osób lub drużyn.",
    icon: Sparkles,
  },
  {
    key: "polls",
    label: "Głosowania",
    description: "Wspólne decyzje ekipy.",
    icon: Vote,
  },
  {
    key: "wheel",
    label: "Koło fortuny",
    description: "Losowanie jednej z osób.",
    icon: Dices,
  },
];

export function TripSettings({
  tripKey,
  isAdmin,
  currentUserId,
  initialProfile,
  initialTrip,
  participants,
  teams,
}: {
  tripKey: string;
  isAdmin: boolean;
  currentUserId: string;
  initialProfile: {
    name: string;
    avatarUrl: string | null;
    phone: string | null;
    revolutUrl: string | null;
    paymentNote: string | null;
  };
  initialTrip: {
    name: string;
    startDate: string | null;
    endDate: string | null;
    destinationName: string | null;
    destinationAddress: string | null;
    destinationMapUrl: string | null;
    playlistUrl: string | null;
    defaultCurrency: CurrencyCode;
    financeMode: FinanceMode;
    settlementStrategy: SettlementStrategy;
    expenseVisibility: ExpenseVisibility;
    expenseViewerIds: string[];
    playlists: Array<{ id: string; name: string; url: string }>;
    modules: TripModules;
    dashboardWidgets: GameplayDashboardWidgetKey[];
    navigation: TripNavigationKey[];
    joinPin: string | null;
    inviteToken: string | null;
    financeEntryCount: number;
    status: "active" | "closed";
    closedAt: string | null;
    packingPresets: PackingPresetKey[];
  };
  participants: ManagedParticipant[];
  teams: ManagedTeam[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requestedView = searchParams.get("view");
  const parsedView = SETTINGS_VIEWS.includes(requestedView as SettingsView)
    ? (requestedView as SettingsView)
    : "menu";
  const permittedView = !isAdmin && !["menu", "profile"].includes(parsedView) ? "menu" : parsedView;
  const view =
    initialTrip.status === "closed" && !["profile", "lifecycle"].includes(permittedView)
      ? "menu"
      : permittedView;
  const [profile, setProfile] = useState({
    name: initialProfile.name,
    avatarUrl: initialProfile.avatarUrl ?? "",
    phone: initialProfile.phone ?? "",
    revolutUrl: initialProfile.revolutUrl ?? "",
    paymentNote: initialProfile.paymentNote ?? "",
    newPin: "",
  });
  const [form, setForm] = useState<TripSettingsState>({
    name: initialTrip.name,
    startDate: initialTrip.startDate ?? "",
    endDate: initialTrip.endDate ?? "",
    destinationName: initialTrip.destinationName ?? "",
    destinationAddress: initialTrip.destinationAddress ?? "",
    destinationMapUrl: initialTrip.destinationMapUrl ?? "",
    playlistUrl: initialTrip.playlistUrl ?? "",
    defaultCurrency: initialTrip.defaultCurrency,
    financeMode: initialTrip.financeMode,
    settlementStrategy: initialTrip.settlementStrategy,
    expenseVisibility: initialTrip.expenseVisibility,
    expenseViewerIds: initialTrip.expenseViewerIds,
    modules: initialTrip.modules,
    dashboardWidgets: initialTrip.dashboardWidgets,
    navigation: initialTrip.navigation,
  });
  const [activityNow, setActivityNow] = useState(() => Date.now());
  const [packingPresetKeys, setPackingPresetKeys] = useState<PackingPresetKey[]>(
    initialTrip.packingPresets,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteAcknowledged, setDeleteAcknowledged] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const nullable = (value: string) => value.trim() || null;

  useEffect(() => {
    const interval = window.setInterval(() => setActivityNow(Date.now()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const openView = (nextView: SettingsView) => {
    setFeedback(null);
    const nextSearchParams = new URLSearchParams(searchParams.toString());
    nextSearchParams.set("view", nextView);
    announceNavigationStart();
    router.push(`${pathname}?${nextSearchParams.toString()}`, { scroll: false });
  };

  const closeView = () => {
    setFeedback(null);
    router.back();
  };

  const navigationOrder = [
    ...form.navigation.filter((key) => form.modules[key]),
    ...TRIP_NAVIGATION_KEYS.filter((key) => form.modules[key] && !form.navigation.includes(key)),
  ];

  const toggleModule = (key: TripModuleKey) => {
    setForm((current) => {
      const enabled =
        key === "scoreboard"
          ? !(current.modules.scoreboard || current.modules.quests)
          : !current.modules[key];
      const modules = {
        ...current.modules,
        [key]: enabled,
        ...(key === "scoreboard" ? { quests: enabled } : {}),
      };
      const navigation = isNavigationKey(key)
        ? enabled
          ? current.navigation.includes(key)
            ? current.navigation
            : [...current.navigation, key]
          : current.navigation.filter((item) => item !== key)
        : current.navigation;

      return {
        ...current,
        modules,
        navigation,
        dashboardWidgets:
          key === "scoreboard"
            ? enabled
              ? current.dashboardWidgets.length > 0
                ? current.dashboardWidgets
                : ["scoreboard"]
              : []
            : current.dashboardWidgets,
      };
    });
  };

  const moveNavigation = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= navigationOrder.length) return;

    const nextOrder = [...navigationOrder];
    const currentItem = nextOrder[index];
    const targetItem = nextOrder[targetIndex];
    if (!currentItem || !targetItem) return;
    nextOrder[index] = targetItem;
    nextOrder[targetIndex] = currentItem;
    setForm((current) => ({ ...current, navigation: nextOrder }));
  };

  const toggleWidget = (key: GameplayDashboardWidgetKey) => {
    setForm((current) => {
      const isEnabled = current.dashboardWidgets.includes(key);
      if (isEnabled && current.dashboardWidgets.length === 1) {
        setFeedback({
          type: "error",
          text: "Rozrywka potrzebuje przynajmniej jednego aktywnego elementu.",
        });
        return current;
      }

      setFeedback(null);
      return {
        ...current,
        dashboardWidgets: isEnabled
          ? current.dashboardWidgets.filter((widget) => widget !== key)
          : [...current.dashboardWidgets, key],
      };
    });
  };

  const saveTrip = async () => {
    if (!isAdmin) return;
    if (form.name.trim().length < 2) {
      setFeedback({ type: "error", text: "Nazwa wyjazdu musi mieć co najmniej 2 znaki." });
      return;
    }

    setIsSaving(true);
    setFeedback(null);
    const result = await runClientAction(
      () =>
        updateTripSettingsAction({
          tripKey,
          name: form.name,
          startDate: nullable(form.startDate),
          endDate: nullable(form.endDate),
          destinationName: nullable(form.destinationName),
          destinationAddress: nullable(form.destinationAddress),
          destinationMapUrl: nullable(form.destinationMapUrl),
          playlistUrl: nullable(form.playlistUrl),
          defaultCurrency: form.defaultCurrency,
          financeMode: form.financeMode,
          settlementStrategy: form.settlementStrategy,
          expenseVisibility: form.expenseVisibility,
          expenseViewerIds: form.expenseViewerIds,
          modules: form.modules,
          dashboardWidgets: form.dashboardWidgets,
          navigation: navigationOrder,
        }),
      "Nie udało się zapisać ustawień wyjazdu.",
    );

    setIsSaving(false);
    if (!result.ok) {
      setFeedback({ type: "error", text: result.error });
      return;
    }

    setFeedback({ type: "success", text: "Zmiany zostały zapisane." });
    router.refresh();
  };

  const saveProfile = async () => {
    setIsSaving(true);
    setFeedback(null);
    const result = await runClientAction(
      () =>
        updateParticipantProfileAction({
          tripKey,
          name: profile.name,
          avatarUrl: nullable(profile.avatarUrl),
          phone: nullable(profile.phone),
          revolutUrl: nullable(profile.revolutUrl),
          paymentNote: nullable(profile.paymentNote),
          newPin: nullable(profile.newPin),
        }),
      "Nie udało się zapisać profilu.",
    );

    setIsSaving(false);
    if (!result.ok) {
      setFeedback({ type: "error", text: result.error });
      return;
    }

    setFeedback({ type: "success", text: "Profil został zapisany." });
    router.refresh();
  };

  const savePackingPresets = async () => {
    setIsSaving(true);
    setFeedback(null);
    const result = await runClientAction(
      () =>
        updatePackingPresetsAction({
          tripKey,
          presetKeys: packingPresetKeys,
        }),
      "Nie udało się zapisać zestawów pakowania.",
    );
    setIsSaving(false);

    if (!result.ok) {
      setFeedback({ type: "error", text: result.error });
      return;
    }

    setFeedback({ type: "success", text: "Zestawy pakowania zostały zapisane." });
    router.refresh();
  };

  const changeTripStatus = async (status: "active" | "closed") => {
    const accepted = window.confirm(
      status === "closed"
        ? "Zamknąć wyjazd? Wszystkie moduły przejdą w tryb tylko do odczytu."
        : "Ponownie otworzyć wyjazd i pozwolić ekipie na wprowadzanie zmian?",
    );
    if (!accepted) return;

    setIsSaving(true);
    setFeedback(null);
    const result = await runClientAction(
      () => setTripStatusAction({ tripKey, status }),
      "Nie udało się zmienić stanu wyjazdu.",
    );
    setIsSaving(false);

    if (!result.ok) {
      setFeedback({ type: "error", text: result.error });
      return;
    }

    setFeedback({
      type: "success",
      text:
        status === "closed"
          ? "Wyjazd został zamknięty i jest dostępny tylko do wglądu."
          : "Wyjazd został ponownie otwarty.",
    });
    router.refresh();
  };

  const deleteTripPermanently = async () => {
    if (isDeleting || deleteConfirmation !== initialTrip.name || !deleteAcknowledged) {
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);
    const result = await runClientAction(
      () =>
        deleteTripPermanentlyAction({
          tripKey,
          confirmationName: deleteConfirmation,
        }),
      "Nie udało się trwale usunąć wyjazdu.",
    );

    if (!result.ok) {
      setIsDeleting(false);
      setDeleteError(result.error);
      return;
    }

    forgetSavedTrip(tripKey);
    announceNavigationStart();
    router.replace("/");
    router.refresh();
  };

  if (view === "menu") {
    return (
      <SettingsPage>
        <SettingsHeader
          title="Ustawienia"
          subtitle={isAdmin ? "Twój profil i ustawienia wyjazdu" : "Twój profil w tym wyjeździe"}
          backHref={`/t/${tripKey}`}
        />

        {isAdmin && initialTrip.joinPin && initialTrip.inviteToken && (
          <TripInviteSettingsCard
            tripName={form.name}
            joinPin={initialTrip.joinPin}
            inviteToken={initialTrip.inviteToken}
          />
        )}

        {initialTrip.status === "closed" && (
          <div className="border-theme-primary/30 bg-theme-primary/8 flex items-start gap-3 rounded-2xl border p-4">
            <LockKeyhole className="text-theme-primary mt-0.5 shrink-0" size={18} />
            <div>
              <p className="text-theme-text text-sm font-bold">Wyjazd jest zamknięty</p>
              <p className="text-theme-muted mt-1 text-xs leading-relaxed">
                Nie można dopisywać wydatków ani zmieniać planu. Profil oraz zgłaszanie i
                potwierdzanie zwrotów pozostają dostępne.
              </p>
            </div>
          </div>
        )}

        <SettingsSectionLabel>Najczęściej używane</SettingsSectionLabel>
        <SettingsMenu>
          <SettingsMenuItem
            icon={UserRound}
            title="Mój profil"
            description="Nazwa, PIN i dane do przelewu"
            onClick={() => openView("profile")}
          />
          {isAdmin && initialTrip.status !== "closed" && (
            <>
              <SettingsMenuItem
                icon={Settings2}
                title="Informacje o wyjeździe"
                description="Nazwa, termin i miejsce docelowe"
                onClick={() => openView("details")}
              />
              {form.modules.finances && (
                <SettingsMenuItem
                  icon={ReceiptText}
                  title="Rozliczenia"
                  description={`${getFinanceModeLabel(form.financeMode)} · ${getSettlementStrategyLabel(form.settlementStrategy)}`}
                  onClick={() => openView("finances")}
                />
              )}
              <SettingsMenuItem
                icon={UsersRound}
                title="Uczestnicy"
                description="Profile, role, aktywność i PIN-y"
                onClick={() => openView("participants")}
              />
            </>
          )}
        </SettingsMenu>

        {isAdmin && initialTrip.status !== "closed" && (
          <SettingsAdvancedMenu>
            <SettingsMenuItem
              icon={Sparkles}
              title="Moduły i nawigacja"
              description="Funkcje wyjazdu i kolejność dolnego paska"
              onClick={() => openView("modules")}
            />
            {form.modules.scoreboard && (
              <SettingsMenuItem
                icon={LayoutGrid}
                title="Elementy Rozrywki"
                description="Punktacja, wyzwania, głosowania i koło"
                onClick={() => openView("widgets")}
              />
            )}
            <SettingsMenuItem
              icon={Music2}
              title="Playlisty"
              description="Soundtracki dostępne dla całej ekipy"
              onClick={() => openView("playlists")}
            />
            <SettingsMenuItem
              icon={PackageCheck}
              title="Pakowanie"
              description="Gotowe zestawy rzeczy dla uczestników"
              onClick={() => openView("packing")}
            />
          </SettingsAdvancedMenu>
        )}

        {isAdmin && (
          <>
            <SettingsSectionLabel>Zarządzanie wyjazdem</SettingsSectionLabel>
            <SettingsMenu>
              <SettingsMenuItem
                icon={initialTrip.status === "closed" ? RotateCcw : LockKeyhole}
                title={initialTrip.status === "closed" ? "Otwórz wyjazd" : "Zakończ wyjazd"}
                description={
                  initialTrip.status === "closed"
                    ? "Wznów możliwość wprowadzania zmian"
                    : "Zablokuj zmiany i zachowaj historię"
                }
                onClick={() => openView("lifecycle")}
              />
            </SettingsMenu>
          </>
        )}
      </SettingsPage>
    );
  }

  if (view === "profile") {
    return (
      <SettingsPage>
        <SettingsHeader title="Mój profil" onBack={closeView} />
        <FeedbackBanner feedback={feedback} />
        <SettingsCard>
          <div className="flex items-center gap-3">
            <Avatar
              user={{
                id: `${tripKey}-${initialProfile.name}`,
                name: profile.name || initialProfile.name,
                avatarUrl: nullable(profile.avatarUrl),
              }}
              className="h-16 w-16 text-2xl"
            />
            <div>
              <p className="text-theme-text font-bold">{profile.name || "Twój profil"}</p>
              <p className="text-theme-muted text-xs">Widoczny tylko w tym wyjeździe</p>
            </div>
          </div>
          <Input
            label="Nazwa"
            value={profile.name}
            onChange={(event) => setProfile({ ...profile, name: event.target.value })}
          />
        </SettingsCard>
        <LocalProfileSettings
          currentProfile={{
            name: profile.name,
            avatarUrl: profile.avatarUrl,
            phone: profile.phone,
            revolutUrl: profile.revolutUrl,
            paymentNote: profile.paymentNote,
          }}
          onApply={(local) =>
            setProfile((current) => ({
              ...current,
              ...local,
            }))
          }
        />
        <SettingsDisclosure
          title="Dane profilu i płatności"
          description="Avatar, telefon, BLIK, Revolut i inne formy zwrotu"
          icon={CircleDollarSign}
          defaultOpen={Boolean(
            profile.avatarUrl || profile.phone || profile.revolutUrl || profile.paymentNote,
          )}
        >
          <Input
            type="url"
            label="Link do avatara"
            value={profile.avatarUrl}
            onChange={(event) => setProfile({ ...profile, avatarUrl: event.target.value })}
            placeholder="https://..."
          />
          <Input
            type="tel"
            label="Telefon / BLIK"
            value={profile.phone}
            onChange={(event) => setProfile({ ...profile, phone: event.target.value })}
            placeholder="+48 123 456 789"
          />
          <Input
            label="Revolut"
            value={profile.revolutUrl}
            onChange={(event) => setProfile({ ...profile, revolutUrl: event.target.value })}
            placeholder="@nazwa lub link revolut.me"
          />
          <label className="flex flex-col gap-1.5">
            <span className="text-theme-muted text-xs font-medium">
              Inny sposób zwrotu pieniędzy
            </span>
            <textarea
              value={profile.paymentNote}
              onChange={(event) => setProfile({ ...profile, paymentNote: event.target.value })}
              placeholder="np. numer konta albo informacja: najlepiej gotówką"
              rows={3}
              maxLength={500}
              className="bg-theme-card text-theme-text placeholder:text-theme-muted border-theme-border focus:border-theme-primary resize-none rounded-xl border p-3 text-sm outline-hidden"
            />
          </label>
          <p className="text-theme-muted text-xs">
            Dane przelewowe zobaczą uczestnicy, którym masz zwrócić pieniądze.
          </p>
        </SettingsDisclosure>
        <SettingsDisclosure
          title="Zmiana PIN-u"
          description="Opcjonalna zmiana 4-cyfrowego PIN-u tego profilu"
          icon={KeyRound}
        >
          <Input
            type="password"
            inputMode="numeric"
            label="Nowy PIN"
            value={profile.newPin}
            onChange={(event) =>
              setProfile({ ...profile, newPin: event.target.value.replace(/\D/g, "").slice(0, 4) })
            }
            placeholder="Zostaw puste, aby nie zmieniać"
            maxLength={4}
          />
          <p className="text-theme-muted text-xs">
            Nowy PIN musi mieć dokładnie 4 cyfry. Zostaw pole puste, aby zachować obecny.
          </p>
        </SettingsDisclosure>
        <SaveButton isSaving={isSaving} onClick={() => void saveProfile()} label="Zapisz profil" />
      </SettingsPage>
    );
  }

  if (view === "details") {
    return (
      <SettingsPage>
        <SettingsHeader title="Informacje o wyjeździe" onBack={closeView} />
        <FeedbackBanner feedback={feedback} />
        <SettingsCard>
          <Input
            label="Nazwa wyjazdu"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />
          <DateRangePicker
            value={{
              from: form.startDate ? parseISO(form.startDate) : undefined,
              to: form.endDate ? parseISO(form.endDate) : undefined,
            }}
            onChange={(range) =>
              setForm({
                ...form,
                startDate: range.from ? format(range.from, "yyyy-MM-dd") : "",
                endDate: range.to ? format(range.to, "yyyy-MM-dd") : "",
              })
            }
          />
        </SettingsCard>
        <SettingsCard title="Miejsce docelowe" icon={MapPin}>
          <Input
            label="Nazwa miejsca"
            value={form.destinationName}
            onChange={(event) => setForm({ ...form, destinationName: event.target.value })}
          />
          <Input
            label="Adres"
            value={form.destinationAddress}
            onChange={(event) => setForm({ ...form, destinationAddress: event.target.value })}
          />
          <Input
            type="url"
            label="Link do mapy"
            value={form.destinationMapUrl}
            onChange={(event) => setForm({ ...form, destinationMapUrl: event.target.value })}
          />
        </SettingsCard>
        <SaveButton isSaving={isSaving} onClick={() => void saveTrip()} />
      </SettingsPage>
    );
  }

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
              const Icon = ICONS[module.key];
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
                const Icon = ICONS[key];
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

  if (view === "finances") {
    const expenseVisibilityLabel =
      form.expenseVisibility === "everyone"
        ? "wszyscy widzą cały wyjazd"
        : form.expenseVisibility === "selected"
          ? "wybrane osoby widzą cały wyjazd"
          : "pełny podgląd tylko dla zarządców";

    return (
      <SettingsPage>
        <SettingsHeader title="Rozliczenia" onBack={closeView} />
        <FeedbackBanner feedback={feedback} />

        {form.financeMode === "legacy" && (
          <div className="border-theme-primary/30 bg-theme-primary/8 rounded-2xl border p-4">
            <p className="text-theme-text text-sm font-bold">Dotychczasowy sposób liczenia</p>
            <p className="text-theme-muted mt-1 text-xs leading-relaxed">
              {initialTrip.financeEntryCount > 0
                ? "Ten wyjazd zachowuje stare rozliczenia, aby historia rachunków pozostała bez zmian."
                : "Rozliczenia są jeszcze puste, więc możesz bezpiecznie wybrać nowy sposób liczenia."}
            </p>
          </div>
        )}

        <SettingsCard title="Domyślna waluta" icon={CircleDollarSign}>
          <label className="flex flex-col gap-1.5">
            <span className="text-theme-muted text-xs">Podpowiadana przy nowych wydatkach</span>
            <select
              value={form.defaultCurrency}
              onChange={(event) =>
                setForm({
                  ...form,
                  defaultCurrency: event.target.value as CurrencyCode,
                })
              }
              className="bg-theme-card text-theme-text border-theme-border h-12 rounded-xl border px-3 text-sm"
            >
              {CURRENCIES.map((currency) => (
                <option key={currency.code} value={currency.code}>
                  {currency.code} · {currency.name}
                </option>
              ))}
            </select>
          </label>
          <p className="text-theme-muted text-xs leading-relaxed">
            Zmiana nie przelicza starszych pozycji. Każda waluta ma osobny bilans, dzięki czemu euro
            i złotówki nigdy nie zostaną przypadkiem zsumowane.
          </p>
        </SettingsCard>

        <SettingsCard title="Sposób dzielenia rachunków" icon={CircleDollarSign}>
          <FinanceModeOption
            selected={form.financeMode === "whole"}
            disabled={initialTrip.financeEntryCount > 0}
            title="Pełne jednostki"
            badge="Polecane"
            description="Rachunek może mieć część dziesiętną, ale udziały pozostałych osób są normalnie zaokrąglane do pełnej jednostki. Reszta zostaje u płatnika."
            onSelect={() => setForm((current) => ({ ...current, financeMode: "whole" }))}
          />
          <FinanceModeOption
            selected={form.financeMode === "precise"}
            disabled={initialTrip.financeEntryCount > 0}
            title="Dokładnie do grosza"
            description="Cały rachunek jest rozliczany co do grosza. Dobre, gdy grupa chce pełnej precyzji."
            onSelect={() => setForm((current) => ({ ...current, financeMode: "precise" }))}
          />
        </SettingsCard>

        <SettingsDisclosure
          title="Więcej opcji rozliczeń"
          description={`${getSettlementStrategyLabel(form.settlementStrategy)} · ${expenseVisibilityLabel}`}
          icon={Settings2}
          defaultOpen={
            form.settlementStrategy !== "relational" || form.expenseVisibility !== "everyone"
          }
        >
          <SettingsCard title="Proponowane przelewy" icon={ArrowUp}>
            <FinanceModeOption
              selected={form.settlementStrategy === "relational"}
              title="Między właściwymi osobami"
              badge="Domyślnie"
              description="Każdy oddaje bezpośrednio tym osobom, które rzeczywiście płaciły za jego część."
              onSelect={() =>
                setForm((current) => ({ ...current, settlementStrategy: "relational" }))
              }
            />
            <FinanceModeOption
              selected={form.settlementStrategy === "optimized"}
              title="Mniej przelewów"
              description="Aplikacja zachowuje końcowe bilanse, ale skraca łańcuch długów i ogranicza liczbę przelewów."
              onSelect={() =>
                setForm((current) => ({ ...current, settlementStrategy: "optimized" }))
              }
            />
          </SettingsCard>

          <SettingsCard title="Widoczność historii wydatków" icon={Eye}>
            <p className="text-theme-muted text-xs leading-relaxed">
              Każdy zawsze widzi rachunki, które go dotyczą. Tutaj ustalasz, kto może dodatkowo
              przeglądać wszystkie pozycje wyjazdu. Zarządcy mają pełny dostęp niezależnie od
              wyboru.
            </p>
            <FinanceModeOption
              selected={form.expenseVisibility === "everyone"}
              title="Wszyscy uczestnicy"
              description="Każda osoba może przełączyć historię między swoimi rachunkami a całym wyjazdem."
              onSelect={() => setForm((current) => ({ ...current, expenseVisibility: "everyone" }))}
            />
            <FinanceModeOption
              selected={form.expenseVisibility === "managers"}
              title="Tylko zarządcy"
              description="Pozostali uczestnicy zobaczą wyłącznie wydatki i przelewy, które ich dotyczą."
              onSelect={() => setForm((current) => ({ ...current, expenseVisibility: "managers" }))}
            />
            <FinanceModeOption
              selected={form.expenseVisibility === "selected"}
              title="Zarządcy i wybrane osoby"
              description="Nadaj pełny podgląd konkretnym uczestnikom bez robienia z nich zarządców."
              onSelect={() => setForm((current) => ({ ...current, expenseVisibility: "selected" }))}
            />

            {form.expenseVisibility === "selected" && (
              <div className="border-theme-border divide-theme-border divide-y overflow-hidden rounded-xl border">
                {participants
                  .filter((participant) => !participant.isAdmin)
                  .map((participant) => {
                    const selected = form.expenseViewerIds.includes(participant.id);
                    return (
                      <label
                        key={participant.id}
                        className="flex min-h-12 cursor-pointer items-center gap-3 px-3 py-2"
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() =>
                            setForm((current) => ({
                              ...current,
                              expenseViewerIds: selected
                                ? current.expenseViewerIds.filter((id) => id !== participant.id)
                                : [...current.expenseViewerIds, participant.id],
                            }))
                          }
                          className="accent-theme-primary size-4"
                        />
                        <span className="text-theme-text text-sm font-semibold">
                          {participant.name}
                        </span>
                      </label>
                    );
                  })}
                {participants.every((participant) => participant.isAdmin) && (
                  <p className="text-theme-muted px-3 py-4 text-xs">
                    Nie ma jeszcze uczestników bez roli Zarządcy.
                  </p>
                )}
              </div>
            )}
          </SettingsCard>
        </SettingsDisclosure>

        {initialTrip.financeEntryCount > 0 && (
          <p className="text-theme-muted border-theme-border rounded-xl border px-4 py-3 text-xs leading-relaxed">
            Sposób zaokrąglania zostaje zablokowany po pierwszym wpisie, aby późniejsza zmiana nie
            naruszyła historii rachunków. Strategię przelewów możesz zmieniać w dowolnym momencie,
            bo nie modyfikuje zapisanych wydatków.
          </p>
        )}

        <SaveButton isSaving={isSaving} onClick={() => void saveTrip()} />
      </SettingsPage>
    );
  }

  if (view === "packing") {
    return (
      <SettingsPage>
        <SettingsHeader title="Pakowanie ekipy" onBack={closeView} />
        <FeedbackBanner feedback={feedback} />
        <p className="text-theme-muted text-sm leading-relaxed">
          Wybierz tylko sytuacje pasujące do tego wyjazdu. Każda osoba dostanie własną listę i może
          dopisać lub ukryć rzeczy bez wpływu na innych.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {PACKING_PRESETS.map((preset) => {
            const selected = packingPresetKeys.includes(preset.key);
            return (
              <button
                key={preset.key}
                type="button"
                aria-pressed={selected}
                onClick={() =>
                  setPackingPresetKeys((current) =>
                    selected
                      ? current.filter((key) => key !== preset.key)
                      : [...current, preset.key],
                  )
                }
                className={cn(
                  "relative flex min-h-28 flex-col items-start rounded-2xl border p-3 text-left transition active:scale-98",
                  selected
                    ? "border-theme-primary/45 bg-theme-primary/10"
                    : "border-theme-border bg-theme-card",
                )}
              >
                <PackageCheck
                  className={selected ? "text-theme-primary" : "text-theme-muted"}
                  size={18}
                />
                <span className="text-theme-text mt-4 text-sm font-bold">{preset.name}</span>
                <span className="text-theme-muted mt-1 text-[11px] leading-snug">
                  {preset.description}
                </span>
                {selected && (
                  <Check className="text-theme-primary absolute top-3 right-3" size={15} />
                )}
              </button>
            );
          })}
        </div>
        <SaveButton
          isSaving={isSaving}
          onClick={() => void savePackingPresets()}
          label="Zapisz zestawy"
        />
      </SettingsPage>
    );
  }

  if (view === "lifecycle") {
    const isClosed = initialTrip.status === "closed";
    return (
      <SettingsPage>
        <SettingsHeader
          title={isClosed ? "Zamknięty wyjazd" : "Zakończenie wyjazdu"}
          onBack={closeView}
        />
        <FeedbackBanner feedback={feedback} />
        <SettingsCard icon={isClosed ? RotateCcw : LockKeyhole}>
          <p className="text-theme-text text-base font-bold">
            {isClosed
              ? "Historia jest zabezpieczona"
              : "Zamknij dopiero po ostatnich rozliczeniach"}
          </p>
          <p className="text-theme-muted text-sm leading-relaxed">
            {isClosed
              ? "Uczestnicy nadal widzą całą historię. Nie mogą zmieniać wydatków ani pozostałych modułów, ale mogą uzupełnić profil oraz dokończyć zgłaszanie i potwierdzanie zwrotów."
              : "Zamknięcie nie usuwa wyjazdu. Zatrzymuje dopisywanie wydatków i edycję pozostałych modułów, ale pozwala ekipie spokojnie dokończyć przelewy."}
          </p>
          {initialTrip.closedAt && (
            <p className="text-theme-muted text-xs">
              Zamknięto{" "}
              {new Intl.DateTimeFormat("pl-PL", {
                dateStyle: "long",
                timeStyle: "short",
              }).format(new Date(initialTrip.closedAt))}
            </p>
          )}
          <Button
            type="button"
            variant={isClosed ? "outline" : "default"}
            className={isClosed ? undefined : "bg-theme-danger hover:bg-theme-danger/90 text-white"}
            disabled={isSaving}
            onClick={() => void changeTripStatus(isClosed ? "active" : "closed")}
          >
            {isSaving ? "Zapisywanie…" : isClosed ? "Otwórz wyjazd ponownie" : "Zamknij wyjazd"}
          </Button>
        </SettingsCard>
        <SettingsCard title="Strefa nieodwracalna" icon={Trash2}>
          <p className="text-theme-muted text-sm leading-relaxed">
            Trwałe usunięcie kasuje uczestników, zakupy, rozrywkę, harmonogram i wszystkie
            rozliczenia. Tej operacji nie można cofnąć.
          </p>
          <p className="text-theme-muted text-xs">
            Obecnie: {participants.length} uczestników i {initialTrip.financeEntryCount} wpisów w
            rozliczeniach.
          </p>
          <Button
            type="button"
            variant="outline"
            className="border-theme-danger/40 text-theme-danger hover:bg-theme-danger/10"
            onClick={() => {
              setDeleteConfirmation("");
              setDeleteAcknowledged(false);
              setDeleteError(null);
              setIsDeleteDialogOpen(true);
            }}
          >
            <Trash2 size={17} /> Usuń wyjazd na zawsze
          </Button>
        </SettingsCard>

        <ResponsiveDialog
          isOpen={isDeleteDialogOpen}
          setIsOpen={(open) => {
            if (isDeleting) return;
            setIsDeleteDialogOpen(open);
          }}
          title="Trwale usunąć wyjazd?"
          description="To nie jest archiwizacja. Po zatwierdzeniu nie będzie możliwości odzyskania danych."
        >
          <div className="flex flex-col gap-4">
            <div className="border-theme-danger/30 bg-theme-danger/10 rounded-2xl border p-4">
              <p className="text-theme-danger text-sm font-bold">
                Zniknie cały wyjazd „{initialTrip.name}”
              </p>
              <p className="text-theme-muted mt-1 text-xs leading-relaxed">
                Wraz z nim zostaną usunięte wszystkie dane uczestników i modułów.
              </p>
            </div>

            <Input
              label={`Wpisz dokładnie: ${initialTrip.name}`}
              value={deleteConfirmation}
              autoComplete="off"
              disabled={isDeleting}
              onChange={(event) => setDeleteConfirmation(event.target.value)}
            />

            <label className="border-theme-border bg-theme-card flex min-h-14 items-start gap-3 rounded-xl border p-3">
              <input
                type="checkbox"
                checked={deleteAcknowledged}
                disabled={isDeleting}
                onChange={(event) => setDeleteAcknowledged(event.target.checked)}
                className="accent-theme-danger mt-0.5 size-5 shrink-0"
              />
              <span className="text-theme-text text-xs leading-relaxed">
                Rozumiem, że usunięcia nie można cofnąć i że archiwizacja zachowałaby dane.
              </span>
            </label>

            {deleteError && <FeedbackBanner feedback={{ type: "error", text: deleteError }} />}

            <Button
              type="button"
              disabled={
                isDeleting || deleteConfirmation !== initialTrip.name || !deleteAcknowledged
              }
              className="bg-theme-danger hover:bg-theme-danger/90 text-white"
              onClick={() => void deleteTripPermanently()}
            >
              <Trash2 size={17} />
              {isDeleting ? "Usuwanie całego wyjazdu…" : "Trwale usuń cały wyjazd"}
            </Button>
          </div>
        </ResponsiveDialog>
      </SettingsPage>
    );
  }

  if (view === "playlists") {
    return (
      <SettingsPage>
        <SettingsHeader title="Playlisty" onBack={closeView} />
        <SettingsCard>
          <p className="text-theme-muted text-xs">
            Dodaj tyle soundtracków, ile potrzebuje ten wyjazd. Pojawią się automatycznie w Bazie i
            w „Więcej”.
          </p>
          <PlaylistSettings tripKey={tripKey} playlists={initialTrip.playlists} />
        </SettingsCard>
      </SettingsPage>
    );
  }

  return (
    <SettingsPage>
      <SettingsHeader title="Uczestnicy" onBack={closeView} />
      <ParticipantManager
        tripKey={tripKey}
        currentUserId={currentUserId}
        participants={participants}
        teams={teams}
        teamsEnabled={form.dashboardWidgets.includes("scoreboard")}
        activityNow={activityNow}
      />
    </SettingsPage>
  );
}

function TripInviteSettingsCard({
  tripName,
  joinPin,
  inviteToken,
}: {
  tripName: string;
  joinPin: string;
  inviteToken: string;
}) {
  const [feedback, setFeedback] = useState<"pin" | "link" | null>(null);

  const showFeedback = (value: "pin" | "link") => {
    setFeedback(value);
    window.setTimeout(() => setFeedback(null), 1800);
  };

  const copy = async (value: "pin" | "link") => {
    try {
      await navigator.clipboard.writeText(
        value === "pin" ? joinPin : `${window.location.origin}/join/${inviteToken}`,
      );
      showFeedback(value);
    } catch {
      // Schowek może być niedostępny bez zgody przeglądarki.
    }
  };

  const share = async () => {
    const url = `${window.location.origin}/join/${inviteToken}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `Dołącz do wyjazdu ${tripName}`, url });
        return;
      } catch (error) {
        if (error && typeof error === "object" && "name" in error && error.name === "AbortError") {
          return;
        }
      }
    }
    await copy("link");
  };

  return (
    <section className="bg-theme-card border-theme-border rounded-2xl border p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-theme-primary text-[10px] font-bold tracking-[0.16em] uppercase">
            Zaproszenie do wyjazdu
          </p>
          <p className="text-theme-muted mt-1 text-xs">Wyślij link albo podaj 6-cyfrowy PIN.</p>
        </div>
        <button
          type="button"
          onClick={() => void share()}
          className="border-theme-border text-theme-muted hover:text-theme-text flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border"
          aria-label="Udostępnij zaproszenie"
        >
          <Share2 size={17} />
        </button>
      </div>
      <div className="border-theme-border mt-4 flex min-h-14 items-center justify-between rounded-xl border px-3">
        <span className="text-theme-text font-mono text-lg font-bold tracking-[0.2em]">
          {joinPin}
        </span>
        <button
          type="button"
          onClick={() => void copy("pin")}
          className="text-theme-muted hover:text-theme-text flex min-h-11 items-center gap-2 px-2 text-xs font-bold"
        >
          {feedback === "pin" ? <Check size={16} /> : <Copy size={16} />}
          {feedback === "pin" ? "Skopiowano" : "Kopiuj PIN"}
        </button>
      </div>
    </section>
  );
}

const TEAM_COLORS = ["#ffb44a", "#49a078", "#3b82f6", "#8b5cf6", "#ef6f6c", "#14b8a6"];

function TeamManager({
  tripKey,
  teams,
  participants,
}: {
  tripKey: string;
  teams: ManagedTeam[];
  participants: ManagedParticipant[];
}) {
  const router = useRouter();
  const [editor, setEditor] = useState<{ teamId: string | null } | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState(TEAM_COLORS[0]!);
  const [isSaving, setIsSaving] = useState(false);
  const [processingUserId, setProcessingUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const editedTeam = teams.find((team) => team.id === editor?.teamId) ?? null;

  const openEditor = (team?: ManagedTeam) => {
    setError(null);
    setName(team?.name ?? "");
    setColor(team?.color ?? TEAM_COLORS[0]!);
    setEditor({ teamId: team?.id ?? null });
  };

  const save = async () => {
    if (!name.trim() || isSaving) return;
    setIsSaving(true);
    setError(null);
    const result = await runClientAction(
      () =>
        editor?.teamId
          ? updateTeamAction({
              tripKey,
              teamId: editor.teamId,
              name,
              color,
            })
          : addTeamAction({ tripKey, name, color }),
      "Nie udało się zapisać drużyny.",
    );
    setIsSaving(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setEditor(null);
    router.refresh();
  };

  const removeTeam = async (team: ManagedTeam) => {
    if (!window.confirm(`Usunąć drużynę ${team.name}? Uczestnicy zostaną bez drużyny.`)) return;
    setIsSaving(true);
    setError(null);
    const result = await runClientAction(
      () => deleteTeamAction({ tripKey, teamId: team.id }),
      "Nie udało się usunąć drużyny.",
    );
    setIsSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  };

  const toggleMember = async (participant: ManagedParticipant) => {
    if (!editedTeam || processingUserId) return;
    setProcessingUserId(participant.id);
    setError(null);
    const result = await runClientAction(
      () =>
        updateParticipantAction({
          tripKey,
          userId: participant.id,
          name: participant.name,
          isAdmin: participant.isAdmin,
          teamId: participant.teamId === editedTeam.id ? null : editedTeam.id,
        }),
      "Nie udało się zmienić składu drużyny.",
    );
    setProcessingUserId(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-theme-text text-sm font-bold">Drużyny · {teams.length}</h2>
          <p className="text-theme-muted mt-0.5 text-xs">Nazwy, kolory i skład punktacji.</p>
        </div>
        <Button type="button" size="sm" onClick={() => openEditor()} className="gap-1.5">
          <Plus size={16} /> Dodaj
        </Button>
      </div>

      {error && (
        <p className="border-theme-danger/30 bg-theme-danger/10 text-theme-danger rounded-xl border px-3 py-2 text-xs font-bold">
          {error}
        </p>
      )}

      {teams.length === 0 ? (
        <button
          type="button"
          onClick={() => openEditor()}
          className="border-theme-border text-theme-muted min-h-20 rounded-xl border border-dashed px-4 text-center text-xs"
        >
          Dodaj pierwszą drużynę
        </button>
      ) : (
        <div className="border-theme-border divide-theme-border divide-y overflow-hidden rounded-xl border px-3">
          {teams.map((team) => {
            const members = participants.filter((participant) => participant.teamId === team.id);
            return (
              <div key={team.id} className="flex min-h-17 items-center gap-3 py-2.5">
                <span
                  className="size-3 shrink-0 rounded-full"
                  style={{ backgroundColor: team.color }}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-theme-text truncate text-sm font-bold">{team.name}</p>
                  <p className="text-theme-muted mt-0.5 truncate text-[10px]">
                    {members.length === 0
                      ? "Bez uczestników"
                      : members.map((member) => member.name).join(", ")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openEditor(team)}
                  className="text-theme-muted hover:text-theme-text flex size-10 items-center justify-center"
                  aria-label={`Edytuj drużynę ${team.name}`}
                >
                  <Pencil size={16} />
                </button>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => void removeTeam(team)}
                  className="text-theme-muted hover:text-theme-danger flex size-10 items-center justify-center disabled:opacity-40"
                  aria-label={`Usuń drużynę ${team.name}`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <ResponsiveDialog
        isOpen={editor !== null}
        setIsOpen={(open) => !open && setEditor(null)}
        title={editor?.teamId ? "Edytuj drużynę" : "Nowa drużyna"}
        description={
          editor?.teamId
            ? "Zmień wygląd drużyny i zaznacz osoby, które mają do niej należeć."
            : "Najpierw nadaj drużynie nazwę i kolor."
        }
      >
        <div className="flex flex-col gap-4">
          {error && (
            <p className="border-theme-danger/30 bg-theme-danger/10 text-theme-danger rounded-xl border px-3 py-2 text-xs font-bold">
              {error}
            </p>
          )}
          <Input
            label="Nazwa drużyny"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />

          <div>
            <p className="text-theme-muted mb-2 text-xs">Kolor</p>
            <div className="flex flex-wrap gap-2">
              {TEAM_COLORS.map((teamColor) => (
                <button
                  key={teamColor}
                  type="button"
                  onClick={() => setColor(teamColor)}
                  className={cn(
                    "flex size-11 items-center justify-center rounded-full border-2",
                    color === teamColor ? "border-theme-text" : "border-transparent",
                  )}
                  aria-label={`Wybierz kolor ${teamColor}`}
                >
                  <span className="size-8 rounded-full" style={{ backgroundColor: teamColor }} />
                </button>
              ))}
              <label className="border-theme-border flex size-11 items-center justify-center overflow-hidden rounded-full border">
                <span className="sr-only">Własny kolor</span>
                <input
                  type="color"
                  value={color}
                  onChange={(event) => setColor(event.target.value)}
                  className="size-14 cursor-pointer border-0 bg-transparent p-0"
                />
              </label>
            </div>
          </div>

          {editedTeam && (
            <div>
              <p className="text-theme-muted mb-2 text-xs">Skład drużyny</p>
              <div className="border-theme-border divide-theme-border divide-y overflow-hidden rounded-xl border">
                {participants.map((participant) => {
                  const selected = participant.teamId === editedTeam.id;
                  const currentTeam = teams.find((team) => team.id === participant.teamId);
                  return (
                    <button
                      key={participant.id}
                      type="button"
                      disabled={processingUserId !== null}
                      onClick={() => void toggleMember(participant)}
                      className="flex min-h-13 w-full items-center gap-3 px-3 text-left disabled:opacity-50"
                    >
                      <Avatar
                        user={{ id: participant.id, name: participant.name, avatarUrl: null }}
                        className="size-8 text-xs"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="text-theme-text block truncate text-sm font-bold">
                          {participant.name}
                        </span>
                        {!selected && currentTeam && (
                          <span className="text-theme-muted block truncate text-[10px]">
                            Obecnie: {currentTeam.name}
                          </span>
                        )}
                      </span>
                      <span
                        className={cn(
                          "border-theme-border flex size-6 items-center justify-center rounded-full border",
                          selected &&
                            "border-theme-primary bg-theme-primary text-theme-primary-foreground",
                        )}
                      >
                        {selected && <Check size={14} strokeWidth={3} />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <Button type="button" onClick={() => void save()} disabled={isSaving || !name.trim()}>
            {isSaving ? "Zapisywanie…" : editor?.teamId ? "Zapisz drużynę" : "Dodaj drużynę"}
          </Button>
        </div>
      </ResponsiveDialog>
    </div>
  );
}

function ParticipantManager({
  tripKey,
  currentUserId,
  participants,
  teams,
  teamsEnabled,
  activityNow,
}: {
  tripKey: string;
  currentUserId: string;
  participants: ManagedParticipant[];
  teams: ManagedTeam[];
  teamsEnabled: boolean;
  activityNow: number;
}) {
  const router = useRouter();
  const [editor, setEditor] = useState<{ userId: string | null } | null>(null);
  const [name, setName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revealedPins, setRevealedPins] = useState<Set<string>>(new Set());

  const openEditor = (participant?: ManagedParticipant) => {
    setError(null);
    setName(participant?.name ?? "");
    setIsAdmin(participant?.isAdmin ?? false);
    setTeamId(participant?.teamId ?? null);
    setEditor({ userId: participant?.id ?? null });
  };

  const save = async () => {
    setIsSaving(true);
    setError(null);
    const result = await runClientAction(
      () =>
        editor?.userId
          ? updateParticipantAction({
              tripKey,
              userId: editor.userId,
              name,
              isAdmin,
              teamId,
            })
          : addParticipantAction({ tripKey, name, isAdmin, teamId }),
      "Nie udało się zapisać uczestnika.",
    );
    setIsSaving(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setEditor(null);
    router.refresh();
  };

  const remove = async (participant: ManagedParticipant) => {
    if (!window.confirm(`Usunąć uczestnika ${participant.name}?`)) return;
    setIsSaving(true);
    setError(null);
    const result = await runClientAction(
      () => deleteParticipantAction({ tripKey, userId: participant.id }),
      "Nie udało się usunąć uczestnika.",
    );
    setIsSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-5">
      {(teamsEnabled || teams.length > 0) && (
        <SettingsDisclosure
          title={
            teams.length > 0 ? `Drużyny do punktacji · ${teams.length}` : "Drużyny do punktacji"
          }
          description="Opcjonalny podział używany tylko w Rozrywce"
          icon={Trophy}
        >
          <TeamManager tripKey={tripKey} teams={teams} participants={participants} />
        </SettingsDisclosure>
      )}

      <SettingsCard>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-theme-text text-sm font-bold">Ekipa · {participants.length}</h2>
            <p className="text-theme-muted mt-0.5 text-xs">Profile dostępne przy dołączaniu.</p>
          </div>
          <Button type="button" size="sm" onClick={() => openEditor()} className="gap-1.5">
            <Plus size={16} /> Dodaj
          </Button>
        </div>

        {error && (
          <p className="border-theme-danger/30 bg-theme-danger/10 text-theme-danger rounded-xl border px-3 py-2 text-xs font-bold">
            {error}
          </p>
        )}

        <div className="border-theme-border divide-theme-border divide-y overflow-hidden rounded-xl border px-3">
          {participants.map((participant) => {
            const revealed = revealedPins.has(participant.id);
            return (
              <div key={participant.id} className="flex min-h-19 items-center gap-2 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-theme-text truncate text-sm font-bold">
                    {participant.name}
                    {participant.id === currentUserId && (
                      <span className="text-theme-muted ml-1.5 text-[9px] uppercase">Ty</span>
                    )}
                    {participant.isAdmin && (
                      <span className="text-theme-primary ml-1.5 text-[9px] tracking-wider uppercase">
                        Zarządca
                      </span>
                    )}
                  </p>
                  <p className="text-theme-muted mt-0.5 truncate text-[10px]">
                    {formatLastSeen(participant.lastSeenAt, activityNow)}
                  </p>
                  {participant.teamId && (
                    <p className="text-theme-muted mt-1 flex items-center gap-1.5 truncate text-[10px]">
                      <span
                        className="size-2 rounded-full"
                        style={{
                          backgroundColor:
                            teams.find((team) => team.id === participant.teamId)?.color ??
                            "var(--theme-muted)",
                        }}
                      />
                      {teams.find((team) => team.id === participant.teamId)?.name ??
                        "Nieznana drużyna"}
                    </p>
                  )}
                  {revealed && (
                    <p className="text-theme-muted mt-1 font-mono text-xs tracking-[0.2em]">
                      {participant.userPin ?? "Nie ustawiono"}
                    </p>
                  )}
                </div>

                {participant.userPin && (
                  <button
                    type="button"
                    onClick={() =>
                      setRevealedPins((current) => {
                        const next = new Set(current);
                        if (next.has(participant.id)) next.delete(participant.id);
                        else next.add(participant.id);
                        return next;
                      })
                    }
                    className="text-theme-muted hover:text-theme-text flex h-10 w-10 items-center justify-center"
                    aria-label={
                      revealed ? `Ukryj PIN ${participant.name}` : `Pokaż PIN ${participant.name}`
                    }
                  >
                    {revealed ? <EyeOff size={16} /> : <KeyRound size={16} />}
                  </button>
                )}
                {participant.id !== currentUserId && (
                  <button
                    type="button"
                    onClick={() => {
                      announceNavigationStart();
                      router.push(`/t/${tripKey}/finances?viewAs=${participant.id}`);
                    }}
                    className="text-theme-muted hover:text-theme-text flex h-10 w-10 items-center justify-center"
                    aria-label={`Podejrzyj rozliczenia ${participant.name}`}
                  >
                    <Eye size={16} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => openEditor(participant)}
                  className="text-theme-muted hover:text-theme-text flex h-10 w-10 items-center justify-center"
                  aria-label={`Edytuj ${participant.name}`}
                >
                  <Pencil size={16} />
                </button>
                {participant.id !== currentUserId && (
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => void remove(participant)}
                    className="text-theme-muted hover:text-theme-danger flex h-10 w-10 items-center justify-center disabled:opacity-40"
                    aria-label={`Usuń ${participant.name}`}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <ResponsiveDialog
          isOpen={editor !== null}
          setIsOpen={(open) => !open && setEditor(null)}
          title={editor?.userId ? "Edytuj uczestnika" : "Nowy uczestnik"}
          description="PIN uczestnika ustawi on sam przy pierwszym wejściu."
        >
          <div className="flex flex-col gap-4">
            {error && (
              <p className="border-theme-danger/30 bg-theme-danger/10 text-theme-danger rounded-xl border px-3 py-2 text-xs font-bold">
                {error}
              </p>
            )}
            <Input
              label="Nazwa"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoFocus
            />
            <button
              type="button"
              onClick={() => setIsAdmin((current) => !current)}
              className={cn(
                "border-theme-border flex min-h-12 items-center justify-between rounded-xl border px-3 text-left",
                isAdmin && "border-theme-primary/40 bg-theme-primary/10",
              )}
            >
              <span>
                <span className="text-theme-text block text-sm font-bold">Zarządca</span>
                <span className="text-theme-muted block text-[11px]">
                  Może zmieniać cały wyjazd
                </span>
              </span>
              {isAdmin && <Check className="text-theme-primary" size={17} />}
            </button>
            {teams.length > 0 && (
              <label className="flex flex-col gap-1.5">
                <span className="text-theme-muted text-xs">Drużyna</span>
                <select
                  value={teamId ?? ""}
                  onChange={(event) => setTeamId(event.target.value || null)}
                  className="bg-theme-card text-theme-text border-theme-border h-12 rounded-xl border px-3 text-sm"
                >
                  <option value="">Bez drużyny</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <Button type="button" onClick={() => void save()} disabled={isSaving || !name.trim()}>
              {isSaving ? "Zapisywanie…" : editor?.userId ? "Zapisz zmiany" : "Dodaj uczestnika"}
            </Button>
          </div>
        </ResponsiveDialog>
      </SettingsCard>
    </div>
  );
}

function isNavigationKey(key: TripModuleKey): key is TripNavigationKey {
  return (TRIP_NAVIGATION_KEYS as readonly string[]).includes(key);
}

function SettingsPage({ children }: { children: React.ReactNode }) {
  return <div className="animate-fade-in pb-safe flex flex-col gap-5 pt-2">{children}</div>;
}

function SettingsHeader({
  title,
  subtitle,
  backHref,
  onBack,
}: {
  title: string;
  subtitle?: string;
  backHref?: string;
  onBack?: () => void;
}) {
  const backClassName =
    "bg-theme-card border-theme-border text-theme-muted flex h-11 w-11 shrink-0 items-center justify-center rounded-full border";

  return (
    <header className="flex items-center gap-3">
      {backHref ? (
        <Link href={backHref} className={backClassName} aria-label="Wróć">
          <ArrowLeft size={19} />
        </Link>
      ) : (
        <button type="button" onClick={onBack} className={backClassName} aria-label="Wróć">
          <ArrowLeft size={19} />
        </button>
      )}
      <div className="min-w-0">
        <h1 className="font-heading text-theme-text text-2xl font-semibold">{title}</h1>
        {subtitle && <p className="text-theme-muted mt-0.5 truncate text-xs">{subtitle}</p>}
      </div>
    </header>
  );
}

function SettingsMenu({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-theme-card border-theme-border divide-theme-border divide-y overflow-hidden rounded-2xl border">
      {children}
    </div>
  );
}

function SettingsSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-theme-muted -mb-2 px-1 text-[10px] font-bold tracking-[0.16em] uppercase">
      {children}
    </p>
  );
}

function SettingsAdvancedMenu({ children }: { children: React.ReactNode }) {
  return (
    <details className="bg-theme-card border-theme-border group overflow-hidden rounded-2xl border">
      <summary className="hover:bg-theme-primary/5 flex min-h-18 cursor-pointer list-none items-center gap-3 px-4 py-3 transition [&::-webkit-details-marker]:hidden">
        <span className="bg-theme-primary/10 text-theme-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
          <Settings2 size={18} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="text-theme-text block text-sm font-bold">Więcej możliwości</span>
          <span className="text-theme-muted mt-0.5 block text-[11px]">
            Moduły, układ, Rozrywka, playlisty i pakowanie
          </span>
        </span>
        <ChevronDown
          className="text-theme-muted shrink-0 transition group-open:rotate-180"
          size={17}
        />
      </summary>
      <div className="border-theme-border divide-theme-border divide-y border-t">{children}</div>
    </details>
  );
}

function SettingsMenuItem({
  icon: Icon,
  title,
  description,
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="hover:bg-theme-primary/5 flex min-h-18 w-full items-center gap-3 px-4 py-3 text-left transition active:scale-99"
    >
      <span className="bg-theme-primary/10 text-theme-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
        <Icon size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="text-theme-text block truncate text-sm font-bold">{title}</span>
        <span className="text-theme-muted mt-0.5 block truncate text-[11px]">{description}</span>
      </span>
      <ChevronRight className="text-theme-muted shrink-0" size={17} />
    </button>
  );
}

function SettingsCard({
  title,
  icon: Icon,
  children,
}: {
  title?: string;
  icon?: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-theme-card border-theme-border flex flex-col gap-4 rounded-2xl border p-4">
      {title && (
        <h2 className="text-theme-text flex items-center gap-2 text-sm font-bold">
          {Icon && <Icon className="text-theme-primary" size={17} />} {title}
        </h2>
      )}
      {children}
    </section>
  );
}

function SettingsDisclosure({
  title,
  description,
  icon: Icon,
  defaultOpen = false,
  children,
}: {
  title: string;
  description: string;
  icon?: LucideIcon;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <details
      className="bg-theme-card border-theme-border group overflow-hidden rounded-2xl border"
      open={isOpen}
      onToggle={(event) => setIsOpen(event.currentTarget.open)}
    >
      <summary className="hover:bg-theme-primary/5 flex min-h-17 cursor-pointer list-none items-center gap-3 px-4 py-3 transition [&::-webkit-details-marker]:hidden">
        {Icon && (
          <span className="bg-theme-primary/10 text-theme-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
            <Icon size={17} />
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="text-theme-text block text-sm font-bold">{title}</span>
          <span className="text-theme-muted mt-0.5 block text-[11px] leading-snug">
            {description}
          </span>
        </span>
        <ChevronDown
          className="text-theme-muted shrink-0 transition group-open:rotate-180"
          size={17}
        />
      </summary>
      <div className="border-theme-border flex flex-col gap-4 border-t p-4">{children}</div>
    </details>
  );
}

function FinanceModeOption({
  selected,
  disabled = false,
  title,
  description,
  badge,
  onSelect,
}: {
  selected: boolean;
  disabled?: boolean;
  title: string;
  description: string;
  badge?: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      className={cn(
        "border-theme-border flex min-h-24 w-full items-start gap-3 rounded-xl border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-55",
        selected && "border-theme-primary/45 bg-theme-primary/10",
      )}
    >
      <span
        className={cn(
          "border-theme-border mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
          selected && "border-theme-primary bg-theme-primary text-theme-primary-foreground",
        )}
      >
        {selected && <Check size={13} strokeWidth={3} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-theme-text text-sm font-bold">{title}</span>
          {badge && (
            <span className="bg-theme-primary/12 text-theme-primary rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase">
              {badge}
            </span>
          )}
        </span>
        <span className="text-theme-muted mt-1 block text-xs leading-relaxed">{description}</span>
      </span>
    </button>
  );
}

function FeedbackBanner({ feedback }: { feedback: Feedback }) {
  if (!feedback) return null;

  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3 text-sm font-bold",
        feedback.type === "success"
          ? "border-theme-success/30 bg-theme-success/10 text-theme-success"
          : "border-theme-danger/30 bg-theme-danger/10 text-theme-danger",
      )}
    >
      {feedback.text}
    </div>
  );
}

function SaveButton({
  isSaving,
  onClick,
  label = "Zapisz ustawienia",
}: {
  isSaving: boolean;
  onClick: () => void;
  label?: string;
}) {
  return (
    <Button onClick={onClick} disabled={isSaving} size="lg" className="gap-2">
      <Save size={18} /> {isSaving ? "Zapisywanie…" : label}
    </Button>
  );
}

function formatLastSeen(value: string | null, nowTimestamp: number) {
  if (!value) return "Jeszcze niewidziany w aplikacji";

  const seenAt = new Date(value);
  const now = new Date(nowTimestamp);
  const difference = Math.max(0, now.getTime() - seenAt.getTime());
  if (difference < 2 * 60_000) return "Widziany niedawno";

  const minutes = Math.floor(difference / 60_000);
  if (minutes < 60) return `Widziany ${relativeMinutes(minutes)} temu`;

  const hours = Math.floor(difference / 3_600_000);
  if (hours < 24) return `Widziany ${relativeHours(hours)} temu`;

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const seenDay = new Date(seenAt.getFullYear(), seenAt.getMonth(), seenAt.getDate()).getTime();
  const days = Math.round((today - seenDay) / 86_400_000);

  if (days === 1) {
    return `Widziany wczoraj o ${seenAt.toLocaleTimeString("pl-PL", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }
  if (days > 1 && days < 7) return `Widziany ${days} dni temu`;
  return `Widziany ${seenAt.toLocaleString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function relativeMinutes(value: number) {
  if (value === 1) return "minutę";
  const lastTwo = value % 100;
  const last = value % 10;
  return last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14)
    ? `${value} minuty`
    : `${value} minut`;
}

function relativeHours(value: number) {
  if (value === 1) return "godzinę";
  const lastTwo = value % 100;
  const last = value % 10;
  return last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14)
    ? `${value} godziny`
    : `${value} godzin`;
}
