"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Flag, Plus, Sparkles, Trash2, Vote } from "lucide-react";
import { ResponsiveDialog } from "~/components/ui/responsive-dialog";
import { Button } from "~/components/ui/button";
import {
  claimChallengeAction,
  closePollAction,
  completeChallengeAction,
  createChallengeAction,
  createPollAction,
  deletePollAction,
  voteInPollAction,
  type GameplayActionResult,
} from "~/app/actions/gameplay";
import { runClientAction } from "~/lib/client-action";
import {cn} from "~/lib/utils";
import { useTripRoute } from "~/providers/trip-route-provider";
import type { Database } from "~/types/database";
import { ChallengeForm, PollForm } from "~/components/modules/scoreboard/game-forms";

type Challenge = Database["public"]["Tables"]["game_challenges"]["Row"];
type ChallengeEntry = Database["public"]["Tables"]["game_challenge_entries"]["Row"];
type Poll = Database["public"]["Tables"]["polls"]["Row"];
type PollOption = Database["public"]["Tables"]["poll_options"]["Row"];
type Participant = Pick<Database["public"]["Tables"]["users"]["Row"], "id" | "name" | "team_id">;
type Team = Pick<Database["public"]["Tables"]["teams"]["Row"], "id" | "name">;

type PollCount = { optionId: string; count: number };
type GameDialog = "challenge" | "poll" | null;

export function GameHub({
  challenges,
  challengeEntries,
  polls,
  pollOptions,
  pollCounts,
  ownVotes,
  participants,
  teams,
  activeUserId,
  activeTeamId,
  isAdmin,
  showChallenges,
  showPolls,
  allowTeams,
  usesPoints,
  compactHeader = false,
}: {
  challenges: Challenge[];
  challengeEntries: ChallengeEntry[];
  polls: Poll[];
  pollOptions: PollOption[];
  pollCounts: PollCount[];
  ownVotes: Record<string, string>;
  participants: Participant[];
  teams: Team[];
  activeUserId: string;
  activeTeamId: string | null;
  isAdmin: boolean;
  showChallenges: boolean;
  showPolls: boolean;
  allowTeams: boolean;
  usesPoints: boolean;
  compactHeader?: boolean;
}) {
  const router = useRouter();
  const { urlKey, isClosed } = useTripRoute();
  const canManage = isAdmin && !isClosed;
  const [tab, setTab] = useState<"challenges" | "polls">("challenges");
  const [dialog, setDialog] = useState<GameDialog>(null);
  const [processingKey, setProcessingKey] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [localOwnVotes, setLocalOwnVotes] = useState(ownVotes);
  const [hiddenPollIds, setHiddenPollIds] = useState<Set<string>>(() => new Set());
  const activeTab = showChallenges && showPolls ? tab : showChallenges ? "challenges" : "polls";
  const canCreateActiveItem = !isClosed && (activeTab === "polls" || isAdmin);
  const visiblePolls = polls.filter((poll) => !hiddenPollIds.has(poll.id));

  useEffect(() => {
    setLocalOwnVotes(ownVotes);
  }, [ownVotes]);

  const runAction = async (key: string, action: () => Promise<GameplayActionResult>) => {
    setProcessingKey(key);
    setActionError(null);
    const result = await runClientAction(action, "Nie udało się wykonać tej akcji.");
    setProcessingKey(null);
    if (!result.ok) {
      setActionError(result.error);
      return false;
    }
    router.refresh();
    return true;
  };

  const ownerName = (entry: ChallengeEntry) => {
    if (entry.team_id) return teams.find((team) => team.id === entry.team_id)?.name ?? "Drużyna";
    return (
      participants.find((participant) => participant.id === entry.user_id)?.name ?? "Uczestnik"
    );
  };

  const isOwnEntry = (entry: ChallengeEntry) =>
    entry.user_id === activeUserId || (!!activeTeamId && entry.team_id === activeTeamId);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex min-h-10 items-end justify-between gap-3">
        {compactHeader ? (
          <p className="text-theme-muted text-xs">
            {activeTab === "challenges"
              ? `${challenges.length} ${challenges.length === 1 ? "aktywne wyzwanie" : "aktywnych wyzwań"}`
              : `${visiblePolls.length} ${visiblePolls.length === 1 ? "głosowanie" : "głosowań"}`}
          </p>
        ) : (
          <div>
            <p className="text-theme-primary text-[10px] font-bold tracking-[0.18em] uppercase">
              {activeTab === "challenges" ? "Wyzwania" : "Głosowania"}
            </p>
            <h2 className="font-heading text-theme-text text-2xl font-semibold">
              {activeTab === "challenges" ? "Zadania ekipy" : "Wspólne decyzje"}
            </h2>
          </div>
        )}

        {canCreateActiveItem && (
          <button
            type="button"
            onClick={() => {
              setActionError(null);
              setDialog(activeTab === "challenges" ? "challenge" : "poll");
            }}
            className="bg-theme-primary text-theme-primary-foreground flex h-10 w-10 shrink-0 items-center justify-center rounded-full shadow-lg transition active:scale-95"
            aria-label={activeTab === "challenges" ? "Dodaj wyzwanie" : "Dodaj głosowanie"}
          >
            <Plus size={19} />
          </button>
        )}
      </div>

      {showChallenges && showPolls && (
        <div className="bg-theme-text/5 grid grid-cols-2 rounded-xl p-1">
          <button
            type="button"
            onClick={() => setTab("challenges")}
            className={`rounded-lg px-3 py-2.5 text-xs font-bold transition ${
              activeTab === "challenges"
                ? "bg-theme-card text-theme-text shadow-xs"
                : "text-theme-muted"
            }`}
          >
            Wyzwania · {challenges.length}
          </button>
          <button
            type="button"
            onClick={() => setTab("polls")}
            className={`rounded-lg px-3 py-2.5 text-xs font-bold transition ${
              activeTab === "polls" ? "bg-theme-card text-theme-text shadow-xs" : "text-theme-muted"
            }`}
          >
            Głosowania · {polls.filter((poll) => poll.status === "open").length}
          </button>
        </div>
      )}

      {actionError && (
        <p className="border-theme-danger/30 bg-theme-danger/5 text-theme-danger rounded-xl border px-3 py-2 text-xs">
          {actionError}
        </p>
      )}

      {activeTab === "challenges" ? (
        <div className="flex flex-col gap-3">
          {challenges.length === 0 ? (
            <EmptyState
              icon={<Flag size={22} />}
              title="Jeszcze bez wyzwań"
              description={
                isAdmin
                  ? allowTeams
                    ? "Dodaj pierwsze zadanie dla osoby albo drużyny."
                    : "Dodaj pierwsze zadanie dla uczestników."
                  : "Zarządca nie dodał jeszcze żadnego wyzwania."
              }
            />
          ) : (
            challenges.map((challenge) => {
              const entries = challengeEntries.filter(
                (entry) => entry.challenge_id === challenge.id && entry.status !== "cancelled",
              );
              const ownEntry = entries.find(isOwnEntry);
              const audienceLabel =
                challenge.audience === "individual"
                  ? "dla osoby"
                  : challenge.audience === "team"
                    ? "dla drużyny"
                    : "dla ekipy";

              return (
                <article
                  key={challenge.id}
                  className="bg-theme-card border-theme-border overflow-hidden rounded-2xl border shadow-xs"
                >
                  <div className="flex flex-col gap-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-theme-muted mb-1 text-[10px] font-bold tracking-wider uppercase">
                          {audienceLabel}
                        </p>
                        <h3 className="font-heading text-theme-text text-xl leading-tight font-semibold">
                          {challenge.title}
                        </h3>
                      </div>
                      {usesPoints && (
                        <span className="bg-theme-accent/12 text-theme-accent shrink-0 rounded-full px-2.5 py-1 text-xs font-black">
                          +{challenge.points}
                        </span>
                      )}
                    </div>

                    {challenge.description && (
                      <p className="text-theme-muted text-sm leading-relaxed">
                        {challenge.description}
                      </p>
                    )}

                    {entries.length > 0 && (
                      <div className="border-theme-border flex flex-col gap-2 border-t border-dashed pt-3">
                        {entries.map((entry) => (
                          <div key={entry.id} className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-theme-text truncate text-xs font-bold">
                                {ownerName(entry)}
                                {isOwnEntry(entry) ? " · Ty" : ""}
                              </p>
                              <p className="text-theme-muted text-[10px]">
                                {entry.status === "completed" ? "Wyzwanie zaliczone" : "W trakcie"}
                              </p>
                            </div>
                            {entry.status === "completed" ? (
                              <Check className="text-theme-accent" size={18} />
                            ) : canManage ? (
                              <button
                                type="button"
                                disabled={processingKey === `complete:${entry.id}`}
                                onClick={() =>
                                  void runAction(`complete:${entry.id}`, () =>
                                    completeChallengeAction({
                                      tripKey: urlKey,
                                      entryId: entry.id,
                                    }),
                                  )
                                }
                                className="border-theme-accent/35 text-theme-accent rounded-lg border px-3 py-1.5 text-[10px] font-bold uppercase disabled:opacity-50"
                              >
                                Zaliczone
                              </button>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    )}

                    {!ownEntry && !isClosed && (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={processingKey === `claim:${challenge.id}`}
                        onClick={() =>
                          void runAction(`claim:${challenge.id}`, () =>
                            claimChallengeAction({ tripKey: urlKey, challengeId: challenge.id }),
                          )
                        }
                        className="w-full gap-2"
                      >
                        <Sparkles size={15} />
                        Podejmij wyzwanie
                      </Button>
                    )}
                  </div>
                </article>
              );
            })
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {visiblePolls.length === 0 ? (
            <EmptyState
              icon={<Vote size={22} />}
              title="Cisza przed głosowaniem"
              description={
                isClosed
                  ? "Na zakończonym wyjeździe głosowania są tylko do wglądu."
                  : "Zapytaj ekipę o plan, jedzenie albo kolejną aktywność."
              }
            />
          ) : (
            visiblePolls.map((poll) => {
              const options = pollOptions.filter((option) => option.poll_id === poll.id);
              const selectedOptionId = localOwnVotes[poll.id];
              const totalVotes = options.reduce(
                (total, option) =>
                  total + (pollCounts.find((item) => item.optionId === option.id)?.count ?? 0),
                0,
              );

              return (
                <details
                  key={poll.id}
                  className="bg-theme-card border-theme-border group overflow-hidden rounded-2xl border shadow-xs"
                >
                  <summary className="flex min-h-20 cursor-pointer list-none items-center gap-3 px-4 py-3">
                    <span
                      className={`size-2.5 shrink-0 rounded-full ${
                        poll.status === "open" ? "bg-theme-accent" : "bg-theme-muted/40"
                      }`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="text-theme-muted block text-[9px] font-bold tracking-wider uppercase">
                        {poll.status === "open" ? "Głosowanie trwa" : "Zamknięte"}
                      </span>
                      <strong className="font-heading text-theme-text mt-0.5 line-clamp-2 block text-lg leading-tight font-semibold">
                        {poll.question}
                      </strong>
                    </span>
                    <span className="text-theme-muted shrink-0 text-[10px]">
                      {totalVotes} {totalVotes === 1 ? "głos" : "głosów"}
                    </span>
                    <ChevronDown
                      className="text-theme-muted shrink-0 transition group-open:rotate-180"
                      size={17}
                    />
                  </summary>

                  <div className="border-theme-border border-t p-4">
                    <p className="text-theme-text mb-4 text-sm leading-relaxed font-semibold whitespace-pre-wrap">
                      {poll.question}
                    </p>
                    <div className="flex flex-col gap-2">
                      {options.map((option) => {
                        const count =
                          pollCounts.find((item) => item.optionId === option.id)?.count ?? 0;
                        const percentage =
                          totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                        const isSelected = selectedOptionId === option.id;

                        return (
                          <button
                            key={option.id}
                            type="button"
                            disabled={
                              isClosed ||
                              poll.status !== "open" ||
                              processingKey?.startsWith(`vote:${poll.id}:`)
                            }
                            onClick={() => {
                              const previousOptionId = localOwnVotes[poll.id];
                              setLocalOwnVotes((current) => ({
                                ...current,
                                [poll.id]: option.id,
                              }));
                              void runAction(`vote:${poll.id}:${option.id}`, () =>
                                voteInPollAction({
                                  tripKey: urlKey,
                                  pollId: poll.id,
                                  optionId: option.id,
                                }),
                              ).then((saved) => {
                                if (saved) return;
                                setLocalOwnVotes((current) => {
                                  const next = { ...current };
                                  if (previousOptionId) next[poll.id] = previousOptionId;
                                  else delete next[poll.id];
                                  return next;
                                });
                              });
                            }}
                            className={`relative overflow-hidden rounded-xl border px-3 py-3 text-left transition disabled:cursor-default ${
                              isSelected
                                ? "border-theme-primary text-theme-text"
                                : "border-theme-border text-theme-muted"
                            }`}
                          >
                            <span
                              className="bg-theme-primary/10 absolute inset-y-0 left-0"
                              style={{ width: `${percentage}%` }}
                            />
                            <span className="relative flex items-center justify-between gap-3 text-xs font-bold">
                              <span className="flex min-w-0 items-center gap-2">
                                {isSelected && (
                                  <Check className="text-theme-primary shrink-0" size={14} />
                                )}
                                <span className="truncate">{option.label}</span>
                              </span>
                              <span className="shrink-0">
                                {count} · {percentage}%
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {canManage && (
                      <div className="border-theme-border mt-3 flex items-center justify-end gap-4 border-t pt-3">
                        {poll.status === "open" && (
                          <button
                            type="button"
                            disabled={processingKey === `close:${poll.id}`}
                            onClick={() =>
                              void runAction(`close:${poll.id}`, () =>
                                closePollAction({ tripKey: urlKey, pollId: poll.id }),
                              )
                            }
                            className="text-theme-primary min-h-10 text-[10px] font-bold uppercase"
                          >
                            Zamknij
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={processingKey === `delete:${poll.id}`}
                          onClick={() => {
                            if (!window.confirm("Usunąć to głosowanie wraz z oddanymi głosami?")) {
                              return;
                            }
                            setHiddenPollIds((current) => new Set(current).add(poll.id));
                            void runAction(`delete:${poll.id}`, () =>
                              deletePollAction({ tripKey: urlKey, pollId: poll.id }),
                            ).then((deleted) => {
                              if (deleted) return;
                              setHiddenPollIds((current) => {
                                const next = new Set(current);
                                next.delete(poll.id);
                                return next;
                              });
                            });
                          }}
                          className="text-theme-danger flex min-h-10 items-center gap-1.5 text-[10px] font-bold uppercase"
                        >
                          <Trash2 size={14} /> Usuń
                        </button>
                      </div>
                    )}
                  </div>
                </details>
              );
            })
          )}
        </div>
      )}

      <ResponsiveDialog
        isOpen={canManage && showChallenges && dialog === "challenge"}
        setIsOpen={(open) => setDialog(open ? "challenge" : null)}
        title="Nowe wyzwanie"
        description={
          allowTeams
            ? "Ustal, czy zadanie podejmuje osoba, czy cała drużyna."
            : "Dodaj zadanie, które może podjąć dowolna osoba."
        }
      >
        {actionError && (
          <p className="border-theme-danger/30 bg-theme-danger/5 text-theme-danger mb-3 rounded-xl border px-3 py-2 text-xs">
            {actionError}
          </p>
        )}
        <ChallengeForm
          allowTeams={allowTeams}
          usesPoints={usesPoints}
          onSubmit={(values) =>
            runAction("create:challenge", () =>
              createChallengeAction({ tripKey: urlKey, ...values }),
            )
          }
          onCreated={() => setDialog(null)}
          isLoading={processingKey === "create:challenge"}
        />
      </ResponsiveDialog>

      <ResponsiveDialog
        isOpen={!isClosed && showPolls && dialog === "poll"}
        setIsOpen={(open) => setDialog(open ? "poll" : null)}
        title="Nowe głosowanie"
        description="Szybka decyzja dla całej ekipy, bez dokładania nowego modułu."
      >
        {actionError && (
          <p className="border-theme-danger/30 bg-theme-danger/5 text-theme-danger mb-3 rounded-xl border px-3 py-2 text-xs">
            {actionError}
          </p>
        )}
        <PollForm
          onSubmit={(values) =>
            runAction("create:poll", () => createPollAction({ tripKey: urlKey, ...values }))
          }
          onCreated={() => setDialog(null)}
          isLoading={processingKey === "create:poll"}
        />
      </ResponsiveDialog>
    </section>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="border-theme-border flex flex-col items-center gap-2 rounded-2xl border border-dashed px-5 py-10 text-center">
      <div className="bg-theme-primary/10 text-theme-primary flex h-11 w-11 items-center justify-center rounded-full">
        {icon}
      </div>
      <p className="font-heading text-theme-text text-lg font-semibold">{title}</p>
      <p className="text-theme-muted max-w-64 text-xs leading-relaxed">{description}</p>
    </div>
  );
}
