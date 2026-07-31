import { notFound, redirect } from "next/navigation";
import { GameplayScreen, type GameplayView } from "~/components/modules/scoreboard/gameplay-screen";
import { parseGameplayDashboardWidgets, parseTripModules } from "~/lib/trip-config";
import { getTripByUrlKey } from "~/lib/server/trips";
import { getTripSession } from "~/lib/server/trip-session";
import { createServerSupabaseClient } from "~/lib/supabase/server";

const VIEW_FEATURE = {
  scores: "scoreboard",
  challenges: "quests",
  polls: "polls",
  wheel: "wheel",
} as const;

export async function GameplayPageContent({
  tripKey,
  view,
}: {
  tripKey: string;
  view: GameplayView;
}) {
  const session = await getTripSession(tripKey);
  if (!session?.userId) redirect(`/t/${tripKey}/join`);

  const trip = await getTripByUrlKey(tripKey);
  if (!trip) notFound();
  if (session.tripId !== trip.id) redirect(`/t/${tripKey}/join`);

  const modules = parseTripModules(trip.modules);
  if (!modules.scoreboard) redirect(`/t/${tripKey}`);

  const features = parseGameplayDashboardWidgets(
    trip.dashboard_widgets,
    trip.layout_config,
    modules,
  );
  const requiredFeature = view === "menu" || view === "minigame" ? null : VIEW_FEATURE[view];
  if (requiredFeature && !features.includes(requiredFeature)) {
    redirect(`/t/${tripKey}/gameplay`);
  }

  const showScores = features.includes("scoreboard");
  const showChallenges = features.includes("quests");
  const showPolls = features.includes("polls");
  const needsTeams =
    (view === "menu" && showScores) ||
    view === "scores" ||
    ((view === "challenges" || view === "polls") && showScores);
  const needsChallenges = showChallenges && (view === "menu" || view === "challenges");
  const needsPolls = showPolls && (view === "menu" || view === "polls");

  const supabase = createServerSupabaseClient();
  const [teamsResult, usersResult, challengesResult, pollsResult] = await Promise.all([
    needsTeams
      ? supabase
          .from("teams")
          .select("*")
          .eq("trip_id", session.tripId)
          .order("score", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("users")
      .select("id, name, team_id, is_admin")
      .eq("trip_id", session.tripId)
      .order("name"),
    needsChallenges
      ? supabase
          .from("game_challenges")
          .select("*")
          .eq("trip_id", session.tripId)
          .eq("is_active", true)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    needsPolls
      ? supabase
          .from("polls")
          .select("*")
          .eq("trip_id", session.tripId)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (teamsResult.error) throw teamsResult.error;
  if (usersResult.error) throw usersResult.error;
  if (challengesResult.error) throw challengesResult.error;
  if (pollsResult.error) throw pollsResult.error;

  const teams = teamsResult.data ?? [];
  const users = usersResult.data ?? [];
  const challenges = (challengesResult.data ?? []).filter(
    (challenge) => showScores || challenge.audience === "individual",
  );
  const polls = pollsResult.data ?? [];
  const challengeIds = view === "challenges" ? challenges.map((challenge) => challenge.id) : [];
  const pollIds = view === "polls" ? polls.map((poll) => poll.id) : [];

  const [entriesResult, optionsResult, votesResult] = await Promise.all([
    challengeIds.length > 0
      ? supabase
          .from("game_challenge_entries")
          .select("*")
          .in("challenge_id", challengeIds)
          .order("claimed_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    pollIds.length > 0
      ? supabase.from("poll_options").select("*").in("poll_id", pollIds).order("sort_order")
      : Promise.resolve({ data: [], error: null }),
    pollIds.length > 0
      ? supabase.from("poll_votes").select("poll_id, option_id, user_id").in("poll_id", pollIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (entriesResult.error) throw entriesResult.error;
  if (optionsResult.error) throw optionsResult.error;
  if (votesResult.error) throw votesResult.error;

  const activeParticipant = users.find((user) => user.id === session.userId);
  if (!activeParticipant) redirect(`/t/${tripKey}/join`);

  const pollCounts = Object.entries(
    (votesResult.data ?? []).reduce<Record<string, number>>((counts, vote) => {
      counts[vote.option_id] = (counts[vote.option_id] ?? 0) + 1;
      return counts;
    }, {}),
  ).map(([optionId, count]) => ({ optionId, count }));

  const ownVotes = Object.fromEntries(
    (votesResult.data ?? [])
      .filter((vote) => vote.user_id === session.userId)
      .map((vote) => [vote.poll_id, vote.option_id]),
  );

  return (
    <GameplayScreen
      tripKey={tripKey}
      view={view}
      features={features}
      challenges={challenges}
      challengeEntries={entriesResult.data ?? []}
      polls={polls}
      pollOptions={optionsResult.data ?? []}
      pollCounts={pollCounts}
      ownVotes={ownVotes}
      participants={users}
      teams={teams}
      activeParticipant={activeParticipant}
    />
  );
}
