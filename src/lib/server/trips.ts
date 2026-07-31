import { cache } from "react";
import { createServerSupabaseClient } from "~/lib/supabase/server";
export { parseTripModules } from "~/lib/trip-config";

export const getTripByUrlKey = cache(async (urlKey: string) => {
  if (!/^[0-9a-f]{12}$/.test(urlKey)) return null;

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("trips")
    .select("*")
    .eq("url_key", urlKey)
    .maybeSingle();

  if (error) throw error;
  return data;
});

export const getTripParticipant = cache(async (tripId: string, userId: string) => {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("users")
    .select("id, name, avatar_url, is_admin, phone, revolut_url, payment_note")
    .eq("id", userId)
    .eq("trip_id", tripId)
    .maybeSingle();

  if (error) throw error;
  return data;
});

export const getTripPlaylists = cache(async (tripId: string, legacyUrl: string | null) => {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("trip_playlists")
    .select("id, name, url, sort_order")
    .eq("trip_id", tripId)
    .order("sort_order")
    .order("created_at");

  if (error && !["42P01", "PGRST205"].includes(error.code)) throw error;
  if (data?.length) return data;

  return legacyUrl
    ? [{ id: "legacy", name: "Playlista wyjazdu", url: legacyUrl, sort_order: 0 }]
    : [];
});
