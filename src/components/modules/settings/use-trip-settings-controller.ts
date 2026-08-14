"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  deleteTripPermanentlyAction,
  setTripStatusAction,
  updateParticipantProfileAction,
  updateTripSettingsAction,
} from "~/app/actions/trips";
import { updatePackingPresetsAction } from "~/app/actions/packing";
import type {
  TripSettingsInitialProfile,
  TripSettingsInitialTrip,
} from "~/components/modules/settings/settings-types";
import {
  SETTINGS_VIEWS,
  type Feedback,
  type SettingsView,
  type TripSettingsState,
} from "~/components/modules/settings/settings-types";
import { runClientAction } from "~/lib/client-action";
import { announceNavigationStart } from "~/lib/navigation-feedback";
import { forgetSavedTrip } from "~/lib/saved-trips";
import type { PackingPresetKey } from "~/lib/packing";
import {
  TRIP_NAVIGATION_KEYS,
  type GameplayDashboardWidgetKey,
  type TripModuleKey,
  type TripNavigationKey,
} from "~/lib/trip-config";

export function useTripSettingsController({
  tripKey,
  isAdmin,
  initialProfile,
  initialTrip,
}: {
  tripKey: string;
  isAdmin: boolean;
  initialProfile: TripSettingsInitialProfile;
  initialTrip: TripSettingsInitialTrip;
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
    theme: initialTrip.theme,
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

  useEffect(() => {
    const boundary = document.querySelector<HTMLElement>(".trip-theme-shell");
    if (!boundary) return;

    boundary.dataset.tripTheme = form.theme;
    document.documentElement.dataset.tripTheme = form.theme;
    return () => {
      boundary.dataset.tripTheme = initialTrip.theme;
      document.documentElement.dataset.tripTheme = initialTrip.theme;
    };
  }, [form.theme, initialTrip.theme]);

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
          theme: form.theme,
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

  return {
    view,
    profile,
    setProfile,
    form,
    setForm,
    activityNow,
    packingPresetKeys,
    setPackingPresetKeys,
    isSaving,
    feedback,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    deleteConfirmation,
    setDeleteConfirmation,
    deleteAcknowledged,
    setDeleteAcknowledged,
    isDeleting,
    deleteError,
    setDeleteError,
    navigationOrder,
    openView,
    closeView,
    nullable,
    toggleModule,
    moveNavigation,
    toggleWidget,
    saveTrip,
    saveProfile,
    savePackingPresets,
    changeTripStatus,
    deleteTripPermanently,
  };
}

function isNavigationKey(key: TripModuleKey): key is TripNavigationKey {
  return (TRIP_NAVIGATION_KEYS as readonly string[]).includes(key);
}
