import { format } from "date-fns";
import type { TripModules } from "~/lib/trip-config";
import { createServerSupabaseClient } from "~/lib/supabase/server";
import {
  calculateFinances,
  type FinanceExpense,
  type FinanceMode,
  type SettlementStrategy,
} from "~/lib/finances";
import type { CurrencyCode } from "~/lib/currencies";

export type DashboardInsights = {
  schedule: {
    next: {
      id: string;
      title: string;
      eventDate: string;
      startTime: string | null;
      locationName: string | null;
    } | null;
    todayCount: number;
  };
  shopping: { open: number; completed: number };
  finances: { balance: number; entries: number };
  scoreboard: {
    leader: { name: string; score: number; color: string | null } | null;
    teams: number;
    activeChallenges: number;
    openPolls: number;
    participants: number;
    activePoll: {
      id: string;
      question: string;
      options: Array<{ id: string; label: string }>;
      ownOptionId: string | null;
      needsVote: boolean;
    } | null;
  };
};

export async function getDashboardInsights({
  tripId,
  userId,
  modules,
  financeMode,
  settlementStrategy,
  currency,
}: {
  tripId: string;
  userId: string;
  modules: TripModules;
  financeMode: FinanceMode;
  settlementStrategy: SettlementStrategy;
  currency: CurrencyCode;
}): Promise<DashboardInsights> {
  const insights: DashboardInsights = {
    schedule: { next: null, todayCount: 0 },
    shopping: { open: 0, completed: 0 },
    finances: { balance: 0, entries: 0 },
    scoreboard: {
      leader: null,
      teams: 0,
      activeChallenges: 0,
      openPolls: 0,
      participants: 0,
      activePoll: null,
    },
  };
  const supabase = createServerSupabaseClient();
  const tasks: Array<Promise<void>> = [];

  if (modules.schedule) {
    tasks.push(
      (async () => {
        const today = format(new Date(), "yyyy-MM-dd");
        const { data, error } = await supabase
          .from("schedule_items")
          .select("id, title, event_date, start_time, location_name")
          .eq("trip_id", tripId)
          .gte("event_date", today)
          .order("event_date")
          .order("start_time")
          .limit(50);

        if (error) {
          console.error("Błąd podglądu harmonogramu w Bazie:", error);
          return;
        }

        const items = data ?? [];
        const next = items.find((item) => item.event_date === today);
        insights.schedule.todayCount = items.filter((item) => item.event_date === today).length;
        insights.schedule.next = next
          ? {
              id: next.id,
              title: next.title,
              eventDate: next.event_date,
              startTime: next.start_time,
              locationName: next.location_name,
            }
          : null;
      })(),
    );
  }

  if (modules.shopping) {
    tasks.push(
      (async () => {
        const { data, error } = await supabase
          .from("shopping_list")
          .select("is_completed")
          .eq("trip_id", tripId);
        if (error) return;
        insights.shopping.completed = (data ?? []).filter((item) => item.is_completed).length;
        insights.shopping.open = (data ?? []).length - insights.shopping.completed;
      })(),
    );
  }

  if (modules.finances) {
    tasks.push(
      (async () => {
        const [usersResult, expensesResult] = await Promise.all([
          supabase.from("users").select("id, name").eq("trip_id", tripId),
          supabase
            .from("expenses")
            .select("*, expense_shares(user_id, amount)")
            .eq("trip_id", tripId)
            .eq("currency", currency)
            .is("deleted_at", null),
        ]);
        if (usersResult.error || expensesResult.error) return;
        const expenses = (expensesResult.data ?? []) as FinanceExpense[];
        const result = calculateFinances(
          expenses,
          usersResult.data ?? [],
          financeMode,
          settlementStrategy,
        );
        insights.finances.balance = result.balances[userId] ?? 0;
        insights.finances.entries = expenses.length;
      })(),
    );
  }

  if (modules.scoreboard || modules.quests) {
    tasks.push(
      (async () => {
        const [teamsResult, challengesResult, pollsResult, participantsResult] = await Promise.all([
          supabase
            .from("teams")
            .select("id, name, score, color_hex")
            .eq("trip_id", tripId)
            .order("score", { ascending: false }),
          supabase.from("game_challenges").select("id").eq("trip_id", tripId).eq("is_active", true),
          supabase
            .from("polls")
            .select("id, question")
            .eq("trip_id", tripId)
            .eq("status", "open")
            .order("created_at", { ascending: false }),
          supabase.from("users").select("id").eq("trip_id", tripId),
        ]);

        const teams = teamsResult.data ?? [];
        const polls = pollsResult.data ?? [];
        insights.scoreboard.teams = teams.length;
        insights.scoreboard.leader = teams[0]
          ? {
              name: teams[0].name,
              score: teams[0].score ?? 0,
              color: teams[0].color_hex,
            }
          : null;
        insights.scoreboard.activeChallenges = challengesResult.data?.length ?? 0;
        insights.scoreboard.openPolls = polls.length;
        insights.scoreboard.participants = participantsResult.data?.length ?? 0;

        if (polls.length === 0) return;
        const pollIds = polls.map((poll) => poll.id);
        const { data: votes } = await supabase
          .from("poll_votes")
          .select("poll_id, option_id")
          .eq("user_id", userId)
          .in("poll_id", pollIds);
        const ownVotes = new Map((votes ?? []).map((vote) => [vote.poll_id, vote.option_id]));
        const activePoll = polls.find((poll) => !ownVotes.has(poll.id)) ?? polls[0];
        if (!activePoll) return;
        const { data: options } = await supabase
          .from("poll_options")
          .select("id, label")
          .eq("poll_id", activePoll.id)
          .order("sort_order");

        insights.scoreboard.activePoll = {
          id: activePoll.id,
          question: activePoll.question,
          options: options ?? [],
          ownOptionId: ownVotes.get(activePoll.id) ?? null,
          needsVote: !ownVotes.has(activePoll.id),
        };
      })(),
    );
  }

  await Promise.all(tasks);
  return insights;
}
