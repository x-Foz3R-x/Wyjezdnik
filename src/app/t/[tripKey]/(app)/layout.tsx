import { redirect } from "next/navigation";
import { BottomNav } from "~/components/bottom-nav";
import { ActivityPing } from "~/components/activity-ping";
import { RememberTrip } from "~/components/remember-trip";
import { LockKeyhole } from "lucide-react";
import { getTripByUrlKey, getTripParticipant, getTripPlaylists } from "~/lib/server/trips";
import { getTripSession } from "~/lib/server/trip-session";
import { TripRouteProvider } from "~/providers/trip-route-provider";
import { parseTripLayout, parseTripModules } from "~/lib/trip-config";
import { parseFinanceMode, parseSettlementStrategy } from "~/lib/finances";
import { parseCurrencyCode } from "~/lib/currencies";
import { LocalProfileOffer } from "~/components/profile/local-profile-offer";

export default async function ProtectedTripLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tripKey: string }>;
}) {
  const { tripKey } = await params;
  const [trip, session] = await Promise.all([getTripByUrlKey(tripKey), getTripSession(tripKey)]);

  if (!trip || !session?.userId || session.tripId !== trip.id) {
    redirect(`/t/${tripKey}/join`);
  }

  const [participant, playlists] = await Promise.all([
    getTripParticipant(trip.id, session.userId),
    getTripPlaylists(trip.id, trip.playlist_url ?? null),
  ]);
  if (!participant) redirect(`/t/${tripKey}/join`);
  const modules = parseTripModules(trip.modules);

  return (
    <TripRouteProvider
      value={{
        tripId: trip.id,
        tripName: trip.name,
        urlKey: trip.url_key,
        userId: participant.id,
        userName: participant.name,
        userAvatarUrl: participant.avatar_url,
        isAdmin: participant.is_admin,
        isClosed: trip.status === "closed",
        defaultCurrency: parseCurrencyCode(trip.default_currency),
        financeMode: parseFinanceMode(trip.finance_mode),
        settlementStrategy: parseSettlementStrategy(trip.settlement_strategy),
        modules,
        layout: parseTripLayout(trip.layout_config, modules, trip.dashboard_widgets),
        playlistUrl: trip.playlist_url ?? null,
        playlists,
        shareAccess: { inviteToken: trip.invite_token, joinPin: trip.join_pin },
      }}
    >
      <ActivityPing tripKey={tripKey} />
      <RememberTrip tripName={trip.name} urlKey={trip.url_key} userName={participant.name} />
      <LocalProfileOffer
        tripKey={tripKey}
        userId={participant.id}
        currentProfile={{
          name: participant.name,
          avatarUrl: participant.avatar_url ?? "",
          phone: participant.phone ?? "",
          revolutUrl: participant.revolut_url ?? "",
          paymentNote: participant.payment_note ?? "",
        }}
      />
      <>
        <div className="min-h-dvh px-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(8.5rem+env(safe-area-inset-bottom))]">
          {trip.status === "closed" && (
            <aside className="border-theme-primary/25 bg-theme-card/85 text-theme-text mb-3 flex items-center gap-3 rounded-2xl border px-3 py-2.5 backdrop-blur-xl">
              <span className="bg-theme-primary/12 text-theme-primary flex size-9 shrink-0 items-center justify-center rounded-xl">
                <LockKeyhole size={17} />
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-bold">Wyjazd zakończony</span>
                <span className="text-theme-muted block text-[11px]">
                  Historia jest chroniona; nadal możecie zgłaszać i potwierdzać zwroty.
                </span>
              </span>
            </aside>
          )}
          {children}
        </div>
        <BottomNav />
      </>
    </TripRouteProvider>
  );
}
