"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createServerSupabaseClient } from "~/lib/supabase/server";
import { verifyPin } from "~/lib/server/pin";
import { getTripSession, setTripSession } from "~/lib/server/trip-session";
import { joinPinSchema, userPinSchema } from "~/app/actions/trip-action-schemas";
import type { TripFormState } from "~/app/actions/trip-action-types";

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
