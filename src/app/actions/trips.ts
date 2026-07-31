"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServerSupabaseClient, hasSupabaseSecretKey } from "~/lib/supabase/server";
import { verifyPin } from "~/lib/server/pin";
import { getTripSession, removeTripSession, setTripSession } from "~/lib/server/trip-session";
import { DASHBOARD_WIDGET_KEYS, TRIP_NAVIGATION_KEYS } from "~/lib/trip-config";
import { parseFinanceMode } from "~/lib/finances";
import { getTripActionContext } from "~/lib/server/trip-action-context";
import { PACKING_PRESET_KEYS } from "~/lib/packing";

export type TripFormState = {
  error: string | null;
};

const joinPinSchema = z.string().regex(/^\d{6}$/);
const userPinSchema = z.string().regex(/^\d{4}$/);
const nullableText = (max: number) => z.string().trim().max(max).nullable();
const nullableUrl = z.string().trim().url().max(1000).nullable();
const financeModeSchema = z.enum(["legacy", "whole", "precise"]);
const settlementStrategySchema = z.enum(["relational", "optimized"]);
const expenseVisibilitySchema = z.enum(["everyone", "managers", "selected"]);
const currencySchema = z.enum(["PLN", "EUR", "USD", "GBP", "CHF", "CZK", "HUF"]);

const tripModulesSchema = z.object({
  schedule: z.boolean(),
  shopping: z.boolean(),
  scoreboard: z.boolean(),
  finances: z.boolean(),
  packing: z.boolean(),
  quests: z.boolean(),
  playlist: z.boolean(),
});

const tripDetailsSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable(),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable(),
    destinationName: nullableText(120),
    destinationAddress: nullableText(300),
    destinationMapUrl: nullableUrl,
    defaultCurrency: currencySchema,
    playlistUrl: nullableUrl,
    modules: tripModulesSchema,
    dashboardWidgets: z.array(z.enum(DASHBOARD_WIDGET_KEYS)).max(DASHBOARD_WIDGET_KEYS.length),
  })
  .refine(
    ({ startDate, endDate }) => !startDate || !endDate || startDate <= endDate,
    "Data zakończenia nie może być wcześniejsza niż data rozpoczęcia.",
  );

const createTripSchema = tripDetailsSchema.and(
  z.object({
    adminName: z.string().trim().min(1).max(60),
    adminPin: userPinSchema,
    members: z.array(z.string().trim().min(1).max(60)).max(100),
    teams: z
      .array(
        z.object({
          id: z.string().min(1),
          name: z.string().trim().min(1).max(60),
          color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
        }),
      )
      .max(20),
    memberAssignments: z.record(z.string(), z.string()),
    packingPresets: z.array(z.enum(PACKING_PRESET_KEYS)).max(PACKING_PRESET_KEYS.length),
  }),
);

const updateTripSettingsSchema = tripDetailsSchema.and(
  z.object({
    tripKey: z.string().regex(/^[0-9a-f]{12}$/),
    financeMode: financeModeSchema,
    settlementStrategy: settlementStrategySchema,
    expenseVisibility: expenseVisibilitySchema,
    expenseViewerIds: z.array(z.string().uuid()).max(100),
    navigation: z.array(z.enum(TRIP_NAVIGATION_KEYS)).max(TRIP_NAVIGATION_KEYS.length),
  }),
);

const updateParticipantProfileSchema = z.object({
  tripKey: z.string().regex(/^[0-9a-f]{12}$/),
  name: z.string().trim().min(1).max(60),
  avatarUrl: nullableUrl,
  phone: nullableText(40),
  revolutUrl: nullableText(300),
  paymentNote: nullableText(500),
  newPin: z
    .string()
    .regex(/^\d{4}$/)
    .nullable(),
});

const addParticipantSchema = z.object({
  tripKey: z.string().regex(/^[0-9a-f]{12}$/),
  name: z.string().trim().min(1).max(60),
  isAdmin: z.boolean(),
  teamId: z.string().uuid().nullable(),
});

const updateParticipantSchema = addParticipantSchema.extend({
  userId: z.string().uuid(),
});

const deleteParticipantSchema = z.object({
  tripKey: z.string().regex(/^[0-9a-f]{12}$/),
  userId: z.string().uuid(),
});

const teamSchema = z.object({
  tripKey: z.string().regex(/^[0-9a-f]{12}$/),
  name: z.string().trim().min(1).max(60),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

const updateTeamSchema = teamSchema.extend({ teamId: z.string().uuid() });
const deleteTeamSchema = z.object({
  tripKey: z.string().regex(/^[0-9a-f]{12}$/),
  teamId: z.string().uuid(),
});
const setTripStatusSchema = z.object({
  tripKey: z.string().regex(/^[0-9a-f]{12}$/),
  status: z.enum(["active", "closed"]),
});
const deleteTripPermanentlySchema = z.object({
  tripKey: z.string().regex(/^[0-9a-f]{12}$/),
  confirmationName: z.string().min(2).max(80),
});

export type CreateTripInput = z.infer<typeof createTripSchema>;
export type UpdateTripSettingsInput = z.infer<typeof updateTripSettingsSchema>;
export type UpdateParticipantProfileInput = z.infer<typeof updateParticipantProfileSchema>;

export type CreateTripResult = { ok: true; urlKey: string } | { ok: false; error: string };
export type UpdateTripSettingsResult = { ok: true } | { ok: false; error: string };
export type UpdateParticipantProfileResult = { ok: true } | { ok: false; error: string };
export type ParticipantMutationResult = { ok: true } | { ok: false; error: string };
export type TeamMutationResult = { ok: true } | { ok: false; error: string };
export type DeleteTripResult = { ok: true } | { ok: false; error: string };

async function getAdminContext(tripKey: string) {
  const context = await getTripActionContext(tripKey);
  return context?.participant.is_admin ? context : null;
}

function closedTripError(context: { isClosed: boolean }) {
  return context.isClosed
    ? {
        ok: false as const,
        error: "Ten wyjazd jest zamknięty. Zarządca może go ponownie otworzyć w ustawieniach.",
      }
    : null;
}

export async function joinTripByPinAction(
  _previousState: TripFormState,
  formData: FormData,
): Promise<TripFormState> {
  const parsedPin = joinPinSchema.safeParse(String(formData.get("joinPin") ?? ""));
  if (!parsedPin.success) return { error: "Wpisz pełny 6-cyfrowy PIN." };

  const supabase = createServerSupabaseClient();
  const { data: trip, error } = await supabase
    .from("trips")
    .select("id, url_key")
    .eq("join_pin", parsedPin.data)
    .maybeSingle();

  if (error) {
    console.error("Błąd wyszukiwania wyjazdu po PIN-ie:", error);
    return { error: "Nie udało się połączyć z bazą wyjazdów. Spróbuj ponownie." };
  }
  if (!trip) return { error: "Nie znaleziono wyjazdu o tym PIN-ie." };

  try {
    await setTripSession({ tripId: trip.id, urlKey: trip.url_key, userId: null });
  } catch {
    return { error: "Brakuje konfiguracji sesji po stronie serwera." };
  }

  redirect(`/t/${trip.url_key}/join?from=pin`);
}

export async function verifyParticipantAction(
  _previousState: TripFormState,
  formData: FormData,
): Promise<TripFormState> {
  const tripKey = String(formData.get("tripKey") ?? "");
  const userId = String(formData.get("userId") ?? "");
  const parsedPin = userPinSchema.safeParse(String(formData.get("userPin") ?? ""));

  if (!/^[0-9a-f]{12}$/.test(tripKey) || !z.string().uuid().safeParse(userId).success) {
    return { error: "Nieprawidłowe dane uczestnika." };
  }
  if (!parsedPin.success) return { error: "Wpisz pełny 4-cyfrowy PIN." };

  const session = await getTripSession(tripKey);
  if (!session) return { error: "Sesja wygasła. Dołącz do wyjazdu ponownie." };

  const supabase = createServerSupabaseClient();
  const { data: user, error } = await supabase
    .from("users")
    .select("id, trip_id, user_pin")
    .eq("id", userId)
    .eq("trip_id", session.tripId)
    .maybeSingle();

  if (error) {
    console.error("Błąd wyszukiwania uczestnika:", error);
    return { error: "Nie udało się połączyć z bazą wyjazdu. Spróbuj ponownie." };
  }
  if (!user) return { error: "Nie znaleziono uczestnika." };

  if (user.user_pin !== null) {
    const isCorrect = verifyPin(parsedPin.data, user.user_pin);
    if (!isCorrect) return { error: "Nieprawidłowy PIN uczestnika." };
  } else {
    const { error: updateError } = await supabase
      .from("users")
      .update({ user_pin: parsedPin.data })
      .eq("id", user.id);

    if (updateError) return { error: "Nie udało się ustawić PIN-u uczestnika." };
  }

  await setTripSession({ tripId: user.trip_id, urlKey: tripKey, userId: user.id });
  redirect(`/t/${tripKey}`);
}

export async function createTripAction(input: CreateTripInput): Promise<CreateTripResult> {
  const parsed = createTripSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Sprawdź dane wyjazdu i spróbuj ponownie." };

  if (!hasSupabaseSecretKey()) {
    return {
      ok: false,
      error: "Brakuje SUPABASE_SECRET_KEY w konfiguracji serwera.",
    };
  }

  const values = parsed.data;
  const supabase = createServerSupabaseClient();

  try {
    const tripPayload = {
      name: values.name,
      start_date: values.startDate,
      end_date: values.endDate,
      destination_name: values.destinationName,
      destination_address: values.destinationAddress,
      destination_map_url: values.destinationMapUrl,
      default_currency: values.defaultCurrency,
      playlist_url: values.playlistUrl,
      modules: values.modules,
      dashboard_widgets: values.dashboardWidgets,
      packing_presets: values.packingPresets,
    };
    let tripResult = await supabase
      .from("trips")
      .insert(tripPayload)
      .select("id, url_key")
      .single();

    if (tripResult.error && ["42703", "PGRST204"].includes(tripResult.error.code)) {
      const legacyTripPayload = {
        name: tripPayload.name,
        start_date: tripPayload.start_date,
        end_date: tripPayload.end_date,
        destination_name: tripPayload.destination_name,
        destination_address: tripPayload.destination_address,
        destination_map_url: tripPayload.destination_map_url,
        default_currency: tripPayload.default_currency,
        playlist_url: tripPayload.playlist_url,
        modules: tripPayload.modules,
        dashboard_widgets: tripPayload.dashboard_widgets,
      };
      tripResult = await supabase
        .from("trips")
        .insert(legacyTripPayload)
        .select("id, url_key")
        .single();
    }

    const { data: trip, error: tripError } = tripResult;

    if (tripError || !trip) throw tripError ?? new Error("Nie utworzono wyjazdu.");

    if (values.playlistUrl) {
      const { error: playlistError } = await supabase.from("trip_playlists").insert({
        trip_id: trip.id,
        name: "Playlista wyjazdu",
        url: values.playlistUrl,
      });
      if (playlistError && !["42P01", "PGRST205"].includes(playlistError.code)) {
        throw playlistError;
      }
    }

    const teamIdMap: Record<string, string> = {};
    if (values.modules.scoreboard && values.teams.length > 0) {
      const { data: teams, error: teamsError } = await supabase
        .from("teams")
        .insert(
          values.teams.map((team) => ({
            trip_id: trip.id,
            name: team.name,
            color_hex: team.color,
          })),
        )
        .select("id, name");

      if (teamsError) throw teamsError;
      for (const team of teams ?? []) {
        const localTeam = values.teams.find((candidate) => candidate.name === team.name);
        if (localTeam) teamIdMap[localTeam.id] = team.id;
      }
    }

    const { data: admin, error: adminError } = await supabase
      .from("users")
      .insert({
        trip_id: trip.id,
        name: values.adminName,
        user_pin: values.adminPin,
        is_admin: true,
        team_id: teamIdMap[values.memberAssignments[values.adminName] ?? ""] ?? null,
      })
      .select("id")
      .single();

    if (adminError || !admin) throw adminError ?? new Error("Nie utworzono organizatora.");

    if (values.members.length > 0) {
      const { error: membersError } = await supabase.from("users").insert(
        values.members.map((name) => ({
          trip_id: trip.id,
          name,
          is_admin: false,
          team_id: teamIdMap[values.memberAssignments[name] ?? ""] ?? null,
        })),
      );

      if (membersError) throw membersError;
    }

    await setTripSession({ tripId: trip.id, urlKey: trip.url_key, userId: admin.id });
    return { ok: true, urlKey: trip.url_key };
  } catch (error) {
    console.error("Błąd tworzenia wyjazdu:", error);
    return { ok: false, error: "Nie udało się utworzyć wyjazdu." };
  }
}

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

export async function addParticipantAction(input: {
  tripKey: string;
  name: string;
  isAdmin: boolean;
  teamId: string | null;
}): Promise<ParticipantMutationResult> {
  const parsed = addParticipantSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Podaj prawidłową nazwę uczestnika." };

  const context = await getAdminContext(parsed.data.tripKey);
  if (!context) return { ok: false, error: "Tylko Zarządca może dodawać uczestników." };
  const closedError = closedTripError(context);
  if (closedError) return closedError;

  if (parsed.data.teamId) {
    const { data: team } = await context.supabase
      .from("teams")
      .select("id")
      .eq("id", parsed.data.teamId)
      .eq("trip_id", context.session.tripId)
      .maybeSingle();
    if (!team) return { ok: false, error: "Wybrana drużyna nie istnieje w tym wyjeździe." };
  }

  const { error } = await context.supabase.from("users").insert({
    trip_id: context.session.tripId,
    name: parsed.data.name,
    is_admin: parsed.data.isAdmin,
    team_id: parsed.data.teamId,
  });

  if (error) {
    console.error("Błąd dodawania uczestnika:", error);
    return { ok: false, error: "Nie udało się dodać uczestnika." };
  }

  revalidatePath(`/t/${parsed.data.tripKey}`, "layout");
  return { ok: true };
}

export async function updateParticipantAction(input: {
  tripKey: string;
  userId: string;
  name: string;
  isAdmin: boolean;
  teamId: string | null;
}): Promise<ParticipantMutationResult> {
  const parsed = updateParticipantSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Sprawdź dane uczestnika." };

  const context = await getAdminContext(parsed.data.tripKey);
  if (!context) return { ok: false, error: "Tylko Zarządca może edytować uczestników." };
  const closedError = closedTripError(context);
  if (closedError) return closedError;

  const { data: target, error: targetError } = await context.supabase
    .from("users")
    .select("is_admin")
    .eq("id", parsed.data.userId)
    .eq("trip_id", context.session.tripId)
    .maybeSingle();
  if (targetError || !target) return { ok: false, error: "Nie znaleziono uczestnika." };

  if (target.is_admin && !parsed.data.isAdmin) {
    const { count } = await context.supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("trip_id", context.session.tripId)
      .eq("is_admin", true);
    if ((count ?? 0) <= 1) {
      return { ok: false, error: "Wyjazd musi mieć przynajmniej jednego Zarządcę." };
    }
  }

  if (parsed.data.teamId) {
    const { data: team } = await context.supabase
      .from("teams")
      .select("id")
      .eq("id", parsed.data.teamId)
      .eq("trip_id", context.session.tripId)
      .maybeSingle();
    if (!team) return { ok: false, error: "Wybrana drużyna nie istnieje w tym wyjeździe." };
  }

  const { error } = await context.supabase
    .from("users")
    .update({
      name: parsed.data.name,
      is_admin: parsed.data.isAdmin,
      team_id: parsed.data.teamId,
    })
    .eq("id", parsed.data.userId)
    .eq("trip_id", context.session.tripId);

  if (error) {
    console.error("Błąd edycji uczestnika:", error);
    return { ok: false, error: "Nie udało się zapisać uczestnika." };
  }

  revalidatePath(`/t/${parsed.data.tripKey}`, "layout");
  return { ok: true };
}

export async function deleteParticipantAction(input: {
  tripKey: string;
  userId: string;
}): Promise<ParticipantMutationResult> {
  const parsed = deleteParticipantSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Nieprawidłowy uczestnik." };

  const context = await getAdminContext(parsed.data.tripKey);
  if (!context) return { ok: false, error: "Tylko Zarządca może usuwać uczestników." };
  const closedError = closedTripError(context);
  if (closedError) return closedError;
  if (context.session.userId === parsed.data.userId) {
    return { ok: false, error: "Nie możesz usunąć aktualnie używanego profilu." };
  }

  const { data: target, error: targetError } = await context.supabase
    .from("users")
    .select("is_admin")
    .eq("id", parsed.data.userId)
    .eq("trip_id", context.session.tripId)
    .maybeSingle();
  if (targetError || !target) return { ok: false, error: "Nie znaleziono uczestnika." };

  if (target.is_admin) {
    const { count } = await context.supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("trip_id", context.session.tripId)
      .eq("is_admin", true);
    if ((count ?? 0) <= 1) {
      return { ok: false, error: "Nie można usunąć jedynego Zarządcy." };
    }
  }

  const { data: deletedParticipant, error } = await context.supabase
    .from("users")
    .delete()
    .eq("id", parsed.data.userId)
    .eq("trip_id", context.session.tripId)
    .select("id")
    .maybeSingle();

  if (error || !deletedParticipant) {
    console.error("Błąd usuwania uczestnika:", error);
    return {
      ok: false,
      error: "Nie udało się usunąć uczestnika. Może mieć powiązane wydatki lub zadania.",
    };
  }

  revalidatePath(`/t/${parsed.data.tripKey}`, "layout");
  return { ok: true };
}

export async function addTeamAction(input: {
  tripKey: string;
  name: string;
  color: string;
}): Promise<TeamMutationResult> {
  const parsed = teamSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Sprawdź nazwę i kolor drużyny." };

  const context = await getAdminContext(parsed.data.tripKey);
  if (!context) return { ok: false, error: "Tylko Zarządca może dodawać drużyny." };
  const closedError = closedTripError(context);
  if (closedError) return closedError;

  const { error } = await context.supabase.from("teams").insert({
    trip_id: context.session.tripId,
    name: parsed.data.name,
    color_hex: parsed.data.color,
  });

  if (error) {
    console.error("Błąd dodawania drużyny:", error);
    return { ok: false, error: "Nie udało się dodać drużyny." };
  }

  revalidatePath(`/t/${parsed.data.tripKey}`, "layout");
  return { ok: true };
}

export async function updateTeamAction(input: {
  tripKey: string;
  teamId: string;
  name: string;
  color: string;
}): Promise<TeamMutationResult> {
  const parsed = updateTeamSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Sprawdź nazwę i kolor drużyny." };

  const context = await getAdminContext(parsed.data.tripKey);
  if (!context) return { ok: false, error: "Tylko Zarządca może edytować drużyny." };
  const closedError = closedTripError(context);
  if (closedError) return closedError;

  const { data, error } = await context.supabase
    .from("teams")
    .update({ name: parsed.data.name, color_hex: parsed.data.color })
    .eq("id", parsed.data.teamId)
    .eq("trip_id", context.session.tripId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    console.error("Błąd edycji drużyny:", error);
    return { ok: false, error: "Nie udało się zapisać drużyny." };
  }

  revalidatePath(`/t/${parsed.data.tripKey}`, "layout");
  return { ok: true };
}

export async function deleteTeamAction(input: {
  tripKey: string;
  teamId: string;
}): Promise<TeamMutationResult> {
  const parsed = deleteTeamSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Nieprawidłowa drużyna." };

  const context = await getAdminContext(parsed.data.tripKey);
  if (!context) return { ok: false, error: "Tylko Zarządca może usuwać drużyny." };
  const closedError = closedTripError(context);
  if (closedError) return closedError;

  const { data: team } = await context.supabase
    .from("teams")
    .select("id")
    .eq("id", parsed.data.teamId)
    .eq("trip_id", context.session.tripId)
    .maybeSingle();
  if (!team) return { ok: false, error: "Nie znaleziono drużyny w tym wyjeździe." };

  const { count, error: entriesError } = await context.supabase
    .from("game_challenge_entries")
    .select("id", { count: "exact", head: true })
    .eq("team_id", parsed.data.teamId);

  if (entriesError) {
    return { ok: false, error: "Nie udało się sprawdzić historii drużyny." };
  }
  if ((count ?? 0) > 0) {
    return {
      ok: false,
      error: "Ta drużyna ma historię wyzwań. Możesz zmienić jej nazwę i skład, ale nie usuwać jej.",
    };
  }

  const { error: unassignError } = await context.supabase
    .from("users")
    .update({ team_id: null })
    .eq("trip_id", context.session.tripId)
    .eq("team_id", parsed.data.teamId);
  if (unassignError) return { ok: false, error: "Nie udało się odpiąć uczestników od drużyny." };

  const { data, error } = await context.supabase
    .from("teams")
    .delete()
    .eq("id", parsed.data.teamId)
    .eq("trip_id", context.session.tripId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    console.error("Błąd usuwania drużyny:", error);
    return { ok: false, error: "Nie udało się usunąć drużyny." };
  }

  revalidatePath(`/t/${parsed.data.tripKey}`, "layout");
  return { ok: true };
}

export async function setTripStatusAction(input: {
  tripKey: string;
  status: "active" | "closed";
}): Promise<UpdateTripSettingsResult> {
  const parsed = setTripStatusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Nieprawidłowy stan wyjazdu." };

  const context = await getAdminContext(parsed.data.tripKey);
  if (!context) {
    return { ok: false, error: "Tylko Zarządca może zamknąć lub ponownie otworzyć wyjazd." };
  }
  if (
    (parsed.data.status === "closed" && context.isClosed) ||
    (parsed.data.status === "active" && !context.isClosed)
  ) {
    return { ok: true };
  }

  const { error } = await context.supabase.rpc("set_trip_status", {
    p_trip_id: context.session.tripId,
    p_changed_by: context.session.userId!,
    p_status: parsed.data.status,
  });

  if (error) {
    console.error("Błąd zmiany stanu wyjazdu:", error);
    return {
      ok: false,
      error:
        parsed.data.status === "closed"
          ? "Nie udało się zamknąć wyjazdu."
          : "Nie udało się ponownie otworzyć wyjazdu.",
    };
  }

  revalidatePath(`/t/${parsed.data.tripKey}`, "layout");
  return { ok: true };
}

export async function deleteTripPermanentlyAction(input: {
  tripKey: string;
  confirmationName: string;
}): Promise<DeleteTripResult> {
  const parsed = deleteTripPermanentlySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Wpisz dokładną nazwę wyjazdu, aby potwierdzić usunięcie." };
  }

  const context = await getAdminContext(parsed.data.tripKey);
  if (!context) {
    return { ok: false, error: "Tylko Zarządca może trwale usunąć wyjazd." };
  }

  const { data: trip, error: tripError } = await context.supabase
    .from("trips")
    .select("name")
    .eq("id", context.session.tripId)
    .maybeSingle();

  if (tripError || !trip) {
    return { ok: false, error: "Nie udało się potwierdzić danych wyjazdu." };
  }
  if (parsed.data.confirmationName !== trip.name) {
    return { ok: false, error: "Nazwa nie jest identyczna z nazwą wyjazdu." };
  }

  const { error } = await context.supabase.rpc("delete_trip_permanently", {
    p_trip_id: context.session.tripId,
    p_deleted_by: context.session.userId!,
    p_confirmation_name: parsed.data.confirmationName,
  });

  if (error) {
    console.error("Błąd trwałego usuwania wyjazdu:", error);
    return {
      ok: false,
      error:
        error.code === "PGRST202"
          ? "Brakuje migracji trwałego usuwania w Supabase."
          : "Nie udało się usunąć wyjazdu. Żadne dane nie zostały częściowo usunięte.",
    };
  }

  await removeTripSession(parsed.data.tripKey);
  revalidatePath("/");
  return { ok: true };
}
