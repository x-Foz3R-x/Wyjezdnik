"use server";

import { revalidatePath } from "next/cache";
import {
  addParticipantSchema,
  deleteParticipantSchema,
  deleteTeamSchema,
  teamSchema,
  updateParticipantSchema,
  updateTeamSchema,
} from "~/app/actions/trip-action-schemas";
import { getAdminTripActionContext, getClosedTripError } from "~/app/actions/trip-action-helpers";
import type {
  ParticipantMutationResult,
  TeamMutationResult,
} from "~/app/actions/trip-action-types";

export async function addParticipantAction(input: {
  tripKey: string;
  name: string;
  isAdmin: boolean;
  teamId: string | null;
}): Promise<ParticipantMutationResult> {
  const parsed = addParticipantSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Podaj prawidłową nazwę uczestnika." };

  const context = await getAdminTripActionContext(parsed.data.tripKey);
  if (!context) return { ok: false, error: "Tylko Zarządca może dodawać uczestników." };
  const closedError = getClosedTripError(context);
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

  const context = await getAdminTripActionContext(parsed.data.tripKey);
  if (!context) return { ok: false, error: "Tylko Zarządca może edytować uczestników." };
  const closedError = getClosedTripError(context);
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

  const context = await getAdminTripActionContext(parsed.data.tripKey);
  if (!context) return { ok: false, error: "Tylko Zarządca może usuwać uczestników." };
  const closedError = getClosedTripError(context);
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

  const context = await getAdminTripActionContext(parsed.data.tripKey);
  if (!context) return { ok: false, error: "Tylko Zarządca może dodawać drużyny." };
  const closedError = getClosedTripError(context);
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

  const context = await getAdminTripActionContext(parsed.data.tripKey);
  if (!context) return { ok: false, error: "Tylko Zarządca może edytować drużyny." };
  const closedError = getClosedTripError(context);
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

  const context = await getAdminTripActionContext(parsed.data.tripKey);
  if (!context) return { ok: false, error: "Tylko Zarządca może usuwać drużyny." };
  const closedError = getClosedTripError(context);
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
