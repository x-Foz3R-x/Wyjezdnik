"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronRight, Sparkles, Trophy, Vote } from "lucide-react";
import { voteInPollAction } from "~/app/actions/gameplay";
import { runClientAction } from "~/lib/client-action";
import type { DashboardInsights } from "~/lib/server/dashboard";
import { useTripRoute } from "~/providers/trip-route-provider";
import { cn } from "~/lib/utils";

export function GameplayWidget({ insight }: { insight: DashboardInsights["scoreboard"] }) {
  const router = useRouter();
  const { urlKey, isClosed } = useTripRoute();
  const poll = insight.activePoll;
  const [ownOptionId, setOwnOptionId] = useState(poll?.ownOptionId ?? null);
  const [processingOptionId, setProcessingOptionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const vote = async (optionId: string) => {
    if (!poll || isClosed || processingOptionId) return;
    const previous = ownOptionId;
    setOwnOptionId(optionId);
    setProcessingOptionId(optionId);
    setError(null);
    const result = await runClientAction(
      () =>
        voteInPollAction({
          tripKey: urlKey,
          pollId: poll.id,
          optionId,
        }),
      "Nie udało się zapisać głosu.",
    );
    setProcessingOptionId(null);

    if (!result.ok) {
      setOwnOptionId(previous);
      setError(result.error);
      return;
    }
    router.refresh();
  };

  if (!poll) {
    return (
      <Link
        href={`/t/${urlKey}/gameplay`}
        className="bg-theme-card border-theme-border col-span-2 flex min-h-32 flex-col rounded-2xl border p-4 transition active:scale-99"
      >
        <div className="flex items-center justify-between gap-3">
          <span className="text-theme-primary flex items-center gap-2 text-[10px] font-bold tracking-[0.14em] uppercase">
            {insight.leader ? <Trophy size={17} /> : <Sparkles size={17} />}
            Rozrywka
          </span>
          <ChevronRight className="text-theme-muted" size={18} />
        </div>
        <div className="mt-auto pt-5">
          <p className="font-heading text-theme-text text-xl font-semibold">
            {insight.leader?.name ?? "Gotowi na pierwszą rundę?"}
          </p>
          <p className="text-theme-muted mt-1 text-xs">
            {insight.leader
              ? `${insight.leader.score} pkt · ${insight.activeChallenges} aktywnych wyzwań`
              : insight.activeChallenges > 0
                ? `${insight.activeChallenges} wyzwań czeka na ekipę`
                : "Wszystkie elementy Rozrywki są w jednym miejscu"}
          </p>
        </div>
      </Link>
    );
  }

  return (
    <section className="bg-theme-card border-theme-border col-span-2 rounded-2xl border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-theme-primary flex items-center gap-2 text-[10px] font-bold tracking-[0.14em] uppercase">
            <Vote size={16} /> Głosowanie w Bazie
          </p>
          <h2 className="font-heading text-theme-text mt-2 text-xl leading-tight font-semibold">
            {poll.question}
          </h2>
        </div>
        <Link
          href={`/t/${urlKey}/gameplay/polls`}
          className="text-theme-muted flex size-10 shrink-0 items-center justify-center rounded-full"
          aria-label="Otwórz całą Rozrywkę"
        >
          <ChevronRight size={18} />
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {poll.options.map((option) => {
          const selected = ownOptionId === option.id;
          return (
            <button
              key={option.id}
              type="button"
              disabled={isClosed || processingOptionId !== null}
              onClick={() => void vote(option.id)}
              className={cn(
                "border-theme-border text-theme-text flex min-h-12 items-center justify-between gap-2 rounded-xl border px-3 text-left text-xs font-bold transition active:scale-98 disabled:cursor-default",
                selected && "border-theme-primary/45 bg-theme-primary/10 text-theme-primary",
              )}
            >
              <span className="line-clamp-2">{option.label}</span>
              {selected && <Check className="shrink-0" size={15} strokeWidth={3} />}
            </button>
          );
        })}
      </div>

      {error && <p className="text-theme-danger mt-2 text-xs">{error}</p>}
      <p className="text-theme-muted mt-3 text-[10px]">
        {isClosed
          ? "Głosowanie jest zachowane w historii zamkniętego wyjazdu."
          : ownOptionId
            ? "Głos zapisany. Możesz zmienić decyzję."
            : "Wybierz odpowiedź bez opuszczania Bazy."}
      </p>
    </section>
  );
}
