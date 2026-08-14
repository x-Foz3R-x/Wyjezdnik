"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "~/lib/supabase/server";
import { getTripSession } from "~/lib/server/trip-session";
import { parseFinanceMode } from "~/lib/finances";
import { getTripActionContext } from "~/lib/server/trip-action-context";
import {
  updateParticipantProfileSchema,
  updateTripSettingsSchema,
  type UpdateParticipantProfileInput,
  type UpdateTripSettingsInput,
} from "~/app/actions/trip-action-schemas";
import type {
  UpdateParticipantProfileResult,
  UpdateTripSettingsResult,
} from "~/app/actions/trip-action-types";

export async function updateTripSettingsAction(
  input: UpdateTripSettingsInput,
): Promise<UpdateTripSettingsResult> {
  const parsed = updateTripSettingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Sprawdź dane i spróbuj ponownie." };

  const values = parsed.data;
  const session = await getTripSession(values.tripKey);
  if (!session?.userId) return { ok: false, error: "Sesja wygasła. Dołącz ponownie." };

  const supabase = createServerSupabaseClient();
  const { data: participant, error: participantError } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", session.userId)
    .eq("trip_id", session.tripId)
    .maybeSingle();

  if (participantError || !participant?.is_admin) {
    return { ok: false, error: "Tylko Zarządca może zmieniać ustawienia wyjazdu." };
  }

  const { data: currentTrip, error: tripError } = await supabase
    .from("trips")
    .select("*")
    .eq("id", session.tripId)
    .eq("url_key", values.tripKey)
    .maybeSingle();

  if (tripError || !currentTrip) {
    return { ok: false, error: "Nie udało się odczytać układu wyjazdu." };
  }
  if (currentTrip.status === "closed") {
    return {
      ok: false,
      error: "Ten wyjazd jest zamknięty. Otwórz go ponownie, aby zmienić ustawienia.",
    };
  }

  if (parseFinanceMode(currentTrip.finance_mode) !== values.financeMode) {
    const { count, error: financeEntriesError } = await supabase
      .from("expenses")
      .select("id", { count: "exact", head: true })
      .eq("trip_id", session.tripId);

    if (financeEntriesError) {
      return { ok: false, error: "Nie udało się sprawdzić historii rozliczeń." };
    }
    if ((count ?? 0) > 0) {
      return {
        ok: false,
        error: "Nie można zmienić trybu rozliczeń po dodaniu pierwszego wpisu.",
      };
    }
  }

  const uniqueExpenseViewerIds = [...new Set(values.expenseViewerIds)];
  if (uniqueExpenseViewerIds.length > 0) {
    const { count, error: viewersError } = await supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("trip_id", session.tripId)
      .in("id", uniqueExpenseViewerIds);

    if (viewersError || count !== uniqueExpenseViewerIds.length) {
      return { ok: false, error: "Wybrane osoby nie należą już do tego wyjazdu." };
    }
  }

  const currentLayout =
    currentTrip.layout_config &&
    typeof currentTrip.layout_config === "object" &&
    !Array.isArray(currentTrip.layout_config)
      ? currentTrip.layout_config
      : {};
  const navigation = values.navigation.filter((key) => values.modules[key]);

  const { error } = await supabase
    .from("trips")
    .update({
      name: values.name,
      start_date: values.startDate,
      end_date: values.endDate,
      destination_name: values.destinationName,
      destination_address: values.destinationAddress,
      destination_map_url: values.destinationMapUrl,
      default_currency: values.defaultCurrency,
      theme: values.theme,
      playlist_url: values.playlistUrl,
      finance_mode: values.financeMode,
      settlement_strategy: values.settlementStrategy,
      expense_visibility: values.expenseVisibility,
      expense_viewer_ids: values.expenseVisibility === "selected" ? uniqueExpenseViewerIds : [],
      modules: values.modules,
      dashboard_widgets: values.dashboardWidgets,
      layout_config: {
        ...currentLayout,
        version: 1,
        navigation,
        navigation_customized: true,
        gameplay_widgets_customized: true,
      },
    })
    .eq("id", session.tripId)
    .eq("url_key", values.tripKey);

  if (error) {
    console.error("Błąd aktualizacji wyjazdu:", error);
    return { ok: false, error: "Nie udało się zapisać zmian." };
  }

  revalidatePath(`/t/${values.tripKey}`, "layout");
  return { ok: true };
}

export async function updateParticipantProfileAction(
  input: UpdateParticipantProfileInput,
): Promise<UpdateParticipantProfileResult> {
  const parsed = updateParticipantProfileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Sprawdź nazwę i link do avatara." };

  const values = parsed.data;
  const context = await getTripActionContext(values.tripKey);
  if (!context) return { ok: false, error: "Sesja wygasła. Dołącz ponownie." };

  const { error } = await context.supabase
    .from("users")
    .update({
      name: values.name,
      avatar_url: values.avatarUrl,
      phone: values.phone,
      revolut_url: values.revolutUrl,
      payment_note: values.paymentNote,
      ...(values.newPin ? { user_pin: values.newPin } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", context.participant.id)
    .eq("trip_id", context.session.tripId);

  if (error) {
    console.error("Błąd aktualizacji profilu uczestnika:", error);
    return { ok: false, error: "Nie udało się zapisać profilu." };
  }

  revalidatePath(`/t/${values.tripKey}`, "layout");
  return { ok: true };
}
