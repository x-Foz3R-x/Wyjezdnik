import Link from "next/link";
import {
  ArrowLeft,
  ChevronRight,
  Dices,
  Flag,
  Gamepad2,
  Luggage,
  Trophy,
  Users,
  Vote,
  type LucideIcon,
} from "lucide-react";
import { GameHub } from "~/components/modules/scoreboard/game-hub";
import { TeamsChart } from "~/components/modules/scoreboard/teams-chart";
import { WheelOfFortune } from "~/components/modules/scoreboard/wheel-of-fortune";
import { BagRushGame } from "~/components/modules/scoreboard/bag-rush-game";
import type { GameplayDashboardWidgetKey } from "~/lib/trip-config";
import type { Database } from "~/types/database";

type Challenge = Database["public"]["Tables"]["game_challenges"]["Row"];
type ChallengeEntry = Database["public"]["Tables"]["game_challenge_entries"]["Row"];
type Poll = Database["public"]["Tables"]["polls"]["Row"];
type PollOption = Database["public"]["Tables"]["poll_options"]["Row"];
type Participant = Pick<
  Database["public"]["Tables"]["users"]["Row"],
  "id" | "name" | "team_id" | "is_admin"
>;
type Team = Database["public"]["Tables"]["teams"]["Row"];

export type GameplayView = "menu" | "scores" | "challenges" | "polls" | "wheel" | "minigame";

type ViewCard = {
  view: Exclude<GameplayView, "menu">;
  feature?: GameplayDashboardWidgetKey;
  title: string;
  description: string;
  icon: LucideIcon;
  tone: string;
};

const VIEW_CARDS: ViewCard[] = [
  {
    view: "minigame",
    title: "Łap bagaż",
    description: "20 sekund lotniskowego refleksu.",
    icon: Luggage,
    tone: "bg-orange-500/14 text-orange-300",
  },
  {
    view: "wheel",
    feature: "wheel",
    title: "Koło fortuny",
    description: "Wylosuj osobę bez dyskusji.",
    icon: Dices,
    tone: "bg-fuchsia-500/14 text-fuchsia-300",
  },
  {
    view: "polls",
    feature: "polls",
    title: "Głosowania",
    description: "Podejmijcie wspólną decyzję.",
    icon: Vote,
    tone: "bg-sky-500/14 text-sky-300",
  },
  {
    view: "challenges",
    feature: "quests",
    title: "Wyzwania",
    description: "Zadania dla osób albo drużyn.",
    icon: Flag,
    tone: "bg-emerald-500/14 text-emerald-300",
  },
  {
    view: "scores",
    feature: "scoreboard",
    title: "Punktacja",
    description: "Wyniki i składy drużyn.",
    icon: Trophy,
    tone: "bg-amber-500/14 text-amber-300",
  },
];

export function GameplayScreen({
  tripKey,
  view,
  features,
  challenges,
  challengeEntries,
  polls,
  pollOptions,
  pollCounts,
  ownVotes,
  participants,
  teams,
  activeParticipant,
}: {
  tripKey: string;
  view: GameplayView;
  features: GameplayDashboardWidgetKey[];
  challenges: Challenge[];
  challengeEntries: ChallengeEntry[];
  polls: Poll[];
  pollOptions: PollOption[];
  pollCounts: Array<{ optionId: string; count: number }>;
  ownVotes: Record<string, string>;
  participants: Participant[];
  teams: Team[];
  activeParticipant: Participant;
}) {
  const visibleCards = VIEW_CARDS.filter(
    (card) => !card.feature || features.includes(card.feature),
  );
  const availableViews = new Set(visibleCards.map((card) => card.view));
  const activeView = view !== "menu" && availableViews.has(view) ? view : "menu";

  if (activeView === "menu") {
    return (
      <div className="animate-fade-in pb-safe flex flex-col gap-5 pt-3">
        <header className="relative overflow-hidden px-1 pt-2 pb-3">
          <div className="pointer-events-none absolute -top-10 right-2 size-28 rounded-full bg-fuchsia-500/10 blur-3xl" />
          <div className="pointer-events-none absolute top-12 -left-8 size-24 rounded-full bg-sky-500/10 blur-3xl" />
          <p className="text-theme-accent flex items-center gap-2 text-[10px] font-bold tracking-[0.2em] uppercase">
            <Gamepad2 size={14} /> Strefa rozrywki
          </p>
          <h1 className="font-heading text-theme-text mt-2 max-w-72 text-4xl leading-[1.02] font-semibold">
            Wybierz, co dziś robimy
          </h1>
        </header>

        <section className="grid grid-cols-2 gap-3" aria-label="Elementy Rozrywki">
          {visibleCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.view}
                href={`/t/${tripKey}/gameplay/${card.view}`}
                className="bg-theme-card border-theme-border group relative flex min-h-44 flex-col overflow-hidden rounded-3xl border p-4 shadow-xs transition active:scale-98"
              >
                <span
                  className={`flex size-11 items-center justify-center rounded-2xl ${card.tone}`}
                >
                  <Icon size={21} />
                </span>
                <span className="mt-auto">
                  <strong className="font-heading text-theme-text block text-lg leading-tight font-semibold">
                    {card.title}
                  </strong>
                  <span className="text-theme-muted mt-1.5 block text-[11px] leading-snug">
                    {getCardDetail(card.view, challenges, polls, participants, teams)}
                  </span>
                </span>
                <ChevronRight className="text-theme-muted/70 absolute top-4 right-4" size={17} />
              </Link>
            );
          })}
        </section>
      </div>
    );
  }

  const activeCard = visibleCards.find((card) => card.view === activeView);
  const ActiveIcon = activeCard?.icon ?? Gamepad2;

  return (
    <div className="animate-fade-in pb-safe flex flex-col gap-5 pt-3">
      <header className="px-1 pt-1">
        <Link
          href={`/t/${tripKey}/gameplay`}
          className="text-theme-muted hover:text-theme-text mb-4 inline-flex min-h-11 items-center gap-2 text-sm font-bold transition"
        >
          <ArrowLeft size={18} /> Strefa rozrywki
        </Link>
        <div className="flex items-center gap-3">
          <span
            className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${
              activeCard?.tone ?? "bg-theme-primary/10 text-theme-primary"
            }`}
          >
            <ActiveIcon size={23} />
          </span>
          <div>
            <p className="text-theme-muted text-[10px] font-bold tracking-[0.16em] uppercase">
              Rozrywka
            </p>
            <h1 className="font-heading text-theme-text text-3xl leading-tight font-semibold">
              {activeCard?.title}
            </h1>
          </div>
        </div>
      </header>

      {activeView === "polls" && (
        <GameHub
          challenges={[]}
          challengeEntries={[]}
          polls={polls}
          pollOptions={pollOptions}
          pollCounts={pollCounts}
          ownVotes={ownVotes}
          participants={participants}
          teams={teams}
          activeUserId={activeParticipant.id}
          activeTeamId={activeParticipant.team_id}
          isAdmin={activeParticipant.is_admin}
          showChallenges={false}
          showPolls
          allowTeams={features.includes("scoreboard")}
          usesPoints={features.includes("scoreboard")}
          compactHeader
        />
      )}

      {activeView === "challenges" && (
        <GameHub
          challenges={challenges}
          challengeEntries={challengeEntries}
          polls={[]}
          pollOptions={[]}
          pollCounts={[]}
          ownVotes={{}}
          participants={participants}
          teams={teams}
          activeUserId={activeParticipant.id}
          activeTeamId={activeParticipant.team_id}
          isAdmin={activeParticipant.is_admin}
          showChallenges
          showPolls={false}
          allowTeams={features.includes("scoreboard")}
          usesPoints={features.includes("scoreboard")}
          compactHeader
        />
      )}

      {activeView === "wheel" && <WheelOfFortune users={participants} />}

      {activeView === "minigame" && <BagRushGame />}

      {activeView === "scores" && (
        <div className="flex flex-col gap-4">
          {teams.length === 0 ? (
            <div className="border-theme-border bg-theme-card/40 rounded-2xl border px-5 py-10 text-center">
              <Trophy className="text-theme-muted mx-auto" size={24} />
              <p className="text-theme-text mt-3 text-sm font-bold">Jeszcze bez drużyn</p>
              <p className="text-theme-muted mt-1 text-xs">
                Zarządca może dodać drużyny w ustawieniach uczestników.
              </p>
            </div>
          ) : (
            <>
              <TeamsChart teams={teams} />
              <details className="border-theme-border bg-theme-card/45 group rounded-2xl border">
                <summary className="text-theme-text flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 text-sm font-bold">
                  <Users className="text-theme-primary" size={18} />
                  Składy drużyn
                  <span className="text-theme-muted ml-auto text-[10px] font-medium">
                    {teams.length}
                  </span>
                </summary>
                <div className="border-theme-border divide-theme-border divide-y border-t px-4 py-1">
                  {teams.map((team) => {
                    const members = participants.filter(
                      (participant) => participant.team_id === team.id,
                    );
                    return (
                      <div key={team.id} className="py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className="size-2.5 rounded-full"
                            style={{
                              backgroundColor: team.color_hex ?? "var(--theme-primary)",
                            }}
                          />
                          <p className="text-theme-text text-sm font-bold">{team.name}</p>
                        </div>
                        <p className="text-theme-muted mt-1 pl-4.5 text-xs">
                          {members.length > 0
                            ? members.map((member) => member.name).join(", ")
                            : "Brak osób w drużynie"}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </details>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function getCardDetail(
  view: ViewCard["view"],
  challenges: Challenge[],
  polls: Poll[],
  participants: Participant[],
  teams: Team[],
) {
  if (view === "minigame") return "20 sekund · rekord na tym urządzeniu";
  if (view === "wheel") return `${participants.length} osób do losowania`;
  if (view === "polls") {
    const open = polls.filter((poll) => poll.status === "open").length;
    return open === 0 ? "Brak otwartych głosowań" : `${open} czeka na głos`;
  }
  if (view === "challenges") {
    return challenges.length === 0 ? "Brak aktywnych wyzwań" : `${challenges.length} aktywnych`;
  }
  return teams.length === 0 ? "Brak drużyn" : `${teams.length} drużyn`;
}
