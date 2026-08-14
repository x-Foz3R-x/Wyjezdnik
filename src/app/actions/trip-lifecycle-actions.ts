"use server";

import { revalidatePath } from "next/cache";
import { removeTripSession } from "~/lib/server/trip-session";
import { getAdminTripActionContext } from "~/app/actions/trip-action-helpers";
import {
  deleteTripPermanentlySchema,
  setTripStatusSchema,
} from "~/app/actions/trip-action-schemas";
import type { DeleteTripResult, UpdateTripSettingsResult } from "~/app/actions/trip-action-types";

export async function setTripStatusAction(input: {
  tripKey: string;
  status: "active" | "closed";
}): Promise<UpdateTripSettingsResult> {
  const parsed = setTripStatusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Nieprawidłowy stan wyjazdu." };

  const context = await getAdminTripActionContext(parsed.data.tripKey);
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

  const context = await getAdminTripActionContext(parsed.data.tripKey);
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
