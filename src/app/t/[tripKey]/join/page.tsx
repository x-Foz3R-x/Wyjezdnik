import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ParticipantPicker } from "~/components/modules/auth/participant-picker";
import { getTripByUrlKey } from "~/lib/server/trips";
import { getTripSession } from "~/lib/server/trip-session";
import { createServerSupabaseClient } from "~/lib/supabase/server";

export default async function JoinTripPage({
  params,
  searchParams,
}: {
  params: Promise<{ tripKey: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { tripKey } = await params;
  const { from } = await searchParams;
  const trip = await getTripByUrlKey(tripKey);
  if (!trip) notFound();

  const session = await getTripSession(tripKey);
  if (!session || session.tripId !== trip.id) redirect("/?error=access-required");

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("users")
    .select("id, name, avatar_url, user_pin")
    .eq("trip_id", trip.id)
    .order("name");

  if (error) throw error;

  const returnHref = session.userId ? `/t/${tripKey}` : from === "pin" ? "/" : null;
  const returnLabel = session.userId ? "Wróć do wyjazdu" : "Wróć";

  return (
    <div className="animate-fade-in relative flex min-h-dvh items-center justify-center px-4 pt-[calc(env(safe-area-inset-top)+2rem)] pb-[calc(env(safe-area-inset-bottom)+7rem)]">
      <ParticipantPicker
        tripKey={tripKey}
        tripName={trip.name}
        participants={(data ?? []).map((participant) => ({
          id: participant.id,
          name: participant.name,
          avatarUrl: participant.avatar_url,
          hasPin: participant.user_pin !== null,
        }))}
      />
      {returnHref && (
        <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+1rem)] z-30 px-4">
          <Link
            href={returnHref}
            className="bg-theme-bg/95 border-theme-border text-theme-muted hover:text-theme-text pointer-events-auto mx-auto flex min-h-12 w-full max-w-md items-center justify-center gap-2 rounded-2xl border px-4 text-sm font-bold shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl transition active:scale-98"
          >
            <ArrowLeft size={17} /> {returnLabel}
          </Link>
        </div>
      )}
    </div>
  );
}
