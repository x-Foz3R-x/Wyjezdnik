import { notFound, redirect } from "next/navigation";
import { Dashboard } from "~/components/modules/hub/dashboard";
import { getTripByUrlKey, getTripParticipant, getTripPlaylists } from "~/lib/server/trips";
import { getTripSession } from "~/lib/server/trip-session";
import {
  getAutomaticDashboardWidgets,
  parseGameplayDashboardWidgets,
  parseTripModules,
} from "~/lib/trip-config";
import { getDashboardInsights } from "~/lib/server/dashboard";
import { parseFinanceMode, parseSettlementStrategy } from "~/lib/finances";
import { createServerSupabaseClient } from "~/lib/supabase/server";
import { getPackingPresetItems, parsePackingPresetKeys } from "~/lib/packing";
import { parseCurrencyCode } from "~/lib/currencies";

export default async function TripDashboardPage({
  params,
}: {
  params: Promise<{ tripKey: string }>;
}) {
  const { tripKey } = await params;
  const session = await getTripSession(tripKey);
  if (!session?.userId) redirect(`/t/${tripKey}/join`);

  const [trip, participant] = await Promise.all([
    getTripByUrlKey(tripKey),
    getTripParticipant(session.tripId, session.userId),
  ]);
  if (!trip) notFound();
  if (session.tripId !== trip.id || !participant) redirect(`/t/${tripKey}/join`);

  const modules = parseTripModules(trip.modules);
  const financeMode = parseFinanceMode(trip.finance_mode);
  const settlementStrategy = parseSettlementStrategy(trip.settlement_strategy);
  const defaultCurrency = parseCurrencyCode(trip.default_currency);
  const gameplayWidgets = parseGameplayDashboardWidgets(
    trip.dashboard_widgets,
    trip.layout_config,
    modules,
  );
  const supabase = createServerSupabaseClient();
  const [
    playlists,
    insights,
    packingStatesResult,
    packingPersonalItemsResult,
    usersResult,
    teamsResult,
  ] = await Promise.all([
    getTripPlaylists(trip.id, trip.playlist_url ?? null),
    getDashboardInsights({
      tripId: trip.id,
      userId: participant.id,
      modules,
      financeMode,
      settlementStrategy,
      currency: defaultCurrency,
    }),
    supabase
      .from("packing_item_states")
      .select("item_key, is_checked, is_hidden")
      .eq("trip_id", trip.id)
      .eq("user_id", participant.id),
    supabase
      .from("packing_personal_items")
      .select("*")
      .eq("trip_id", trip.id)
      .eq("user_id", participant.id)
      .order("sort_order")
      .order("created_at"),
    supabase
      .from("users")
      .select("id, name, avatar_url, is_admin, last_seen_at, team_id")
      .eq("trip_id", trip.id)
      .order("name"),
    supabase.from("teams").select("id, name, color_hex").eq("trip_id", trip.id),
  ]);
  const packingPresetItems = getPackingPresetItems(parsePackingPresetKeys(trip.packing_presets));
  const dashboardWidgets = getAutomaticDashboardWidgets({
    modules,
    hasDestination: Boolean(trip.destination_name || trip.destination_address),
    hasPlaylists: playlists.length > 0,
    gameplayWidgets,
  });

  return (
    <Dashboard
      tripName={trip.name}
      urlKey={trip.url_key}
      participant={{
        id: participant.id,
        name: participant.name,
        avatarUrl: participant.avatar_url,
      }}
      isAdmin={participant.is_admin}
      startDate={trip.start_date}
      endDate={trip.end_date}
      destinationName={trip.destination_name ?? null}
      destinationAddress={trip.destination_address ?? null}
      destinationMapUrl={trip.destination_map_url ?? null}
      playlists={playlists}
      modules={modules}
      financeMode={financeMode}
      currency={defaultCurrency}
      dashboardWidgets={dashboardWidgets}
      insights={insights}
      participants={(usersResult.data ?? []).map((user) => ({
        id: user.id,
        name: user.name,
        avatarUrl: user.avatar_url,
        isAdmin: user.is_admin,
        lastSeenAt: user.last_seen_at,
        team: user.team_id
          ? (() => {
              const team = (teamsResult.data ?? []).find(
                (candidate) => candidate.id === user.team_id,
              );
              return team ? { name: team.name, color: team.color_hex } : null;
            })()
          : null,
      }))}
      packing={{
        presetItems: packingPresetItems,
        states: packingStatesResult.error ? [] : (packingStatesResult.data ?? []),
        personalItems: packingPersonalItemsResult.error
          ? []
          : (packingPersonalItemsResult.data ?? []),
        isReadOnly: trip.status === "closed",
      }}
    />
  );
}
