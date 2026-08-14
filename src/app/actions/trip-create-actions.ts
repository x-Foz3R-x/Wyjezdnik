"use server";

import { createServerSupabaseClient, hasSupabaseSecretKey } from "~/lib/supabase/server";
import { setTripSession } from "~/lib/server/trip-session";
import { createTripSchema, type CreateTripInput } from "~/app/actions/trip-action-schemas";
import type { CreateTripResult } from "~/app/actions/trip-action-types";

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
