"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Clock3, Luggage, Play, RotateCcw, Trophy, Zap } from "lucide-react";
import { Button } from "~/components/ui/button";

type GamePhase = "idle" | "playing" | "finished";

const ROUND_SECONDS = 20;
const BEST_SCORE_KEY = "wyjezdnik:bag-rush:best:v1";
const TARGET_POSITIONS = [
  { x: 14, y: 18 },
  { x: 38, y: 16 },
  { x: 65, y: 19 },
  { x: 86, y: 16 },
  { x: 20, y: 42 },
  { x: 49, y: 39 },
  { x: 78, y: 43 },
  { x: 12, y: 68 },
  { x: 36, y: 72 },
  { x: 64, y: 67 },
  { x: 87, y: 72 },
  { x: 24, y: 88 },
  { x: 53, y: 87 },
  { x: 80, y: 89 },
] as const;

export function BagRushGame() {
  const [phase, setPhase] = useState<GamePhase>("idle");
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [misses, setMisses] = useState(0);
  const [streak, setStreak] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(ROUND_SECONDS);
  const [targetIndex, setTargetIndex] = useState(5);
  const endAtRef = useRef(0);

  useEffect(() => {
    try {
      const stored = Number(window.localStorage.getItem(BEST_SCORE_KEY));
      if (Number.isFinite(stored) && stored > 0) setBestScore(Math.floor(stored));
    } catch {
      // Rekord jest dodatkiem i nie może blokować gry w prywatnym trybie.
    }
  }, []);

  useEffect(() => {
    if (phase !== "playing") return;

    const updateTime = () => {
      const remaining = Math.max(0, Math.ceil((endAtRef.current - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0) setPhase("finished");
    };
    updateTime();
    const timer = window.setInterval(updateTime, 150);
    return () => window.clearInterval(timer);
  }, [phase]);

  const moveTarget = useCallback(() => {
    setTargetIndex((current) => {
      if (TARGET_POSITIONS.length < 2) return current;
      let next = current;
      while (next === current) next = Math.floor(Math.random() * TARGET_POSITIONS.length);
      return next;
    });
  }, []);

  useEffect(() => {
    if (phase !== "playing") return;
    const movement = window.setInterval(moveTarget, 850);
    return () => window.clearInterval(movement);
  }, [moveTarget, phase]);

  useEffect(() => {
    if (phase !== "finished" || score <= bestScore) return;
    setBestScore(score);
    try {
      window.localStorage.setItem(BEST_SCORE_KEY, String(score));
    } catch {
      // Wynik rundy pozostaje widoczny także bez dostępu do localStorage.
    }
  }, [bestScore, phase, score]);

  const startRound = () => {
    setScore(0);
    setMisses(0);
    setStreak(0);
    setSecondsLeft(ROUND_SECONDS);
    setTargetIndex(Math.floor(Math.random() * TARGET_POSITIONS.length));
    endAtRef.current = Date.now() + ROUND_SECONDS * 1000;
    setPhase("playing");
  };

  const catchBag = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (phase !== "playing") return;
    setScore((current) => current + 1);
    setStreak((current) => current + 1);
    moveTarget();
    navigator.vibrate?.(18);
  };

  const missBag = () => {
    if (phase !== "playing") return;
    setMisses((current) => current + 1);
    setStreak(0);
  };

  const target = TARGET_POSITIONS[targetIndex] ?? TARGET_POSITIONS[0];

  return (
    <section className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-2">
        <GameStat icon={Zap} label="Wynik" value={score} />
        <GameStat icon={Clock3} label="Czas" value={`${secondsLeft}s`} />
        <GameStat icon={Trophy} label="Rekord" value={bestScore} />
      </div>

      <div
        className="border-theme-border bg-theme-card/50 relative min-h-[24rem] touch-manipulation overflow-hidden rounded-3xl border shadow-inner select-none"
        onPointerDown={missBag}
        aria-label="Plansza gry Łap bagaż"
      >
        <div className="pointer-events-none absolute inset-0 [background-image:radial-gradient(circle_at_center,var(--theme-border)_1px,transparent_1px)] [background-size:28px_28px] opacity-40" />

        {phase === "playing" && target && (
          <button
            type="button"
            onPointerDown={catchBag}
            className="bg-theme-primary text-theme-primary-foreground absolute z-10 flex size-17 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-2xl shadow-[0_12px_35px_rgba(0,0,0,0.3)] transition-[top,left,transform] duration-150 active:scale-90"
            style={{ left: `${target.x}%`, top: `${target.y}%` }}
            aria-label="Złap bagaż"
          >
            <Luggage size={30} strokeWidth={2.4} />
          </button>
        )}

        {phase !== "playing" && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center px-6 text-center">
            <span className="bg-theme-primary/12 text-theme-primary flex size-18 items-center justify-center rounded-3xl">
              <Luggage size={32} />
            </span>
            <h2 className="font-heading text-theme-text mt-5 text-3xl font-semibold">
              {phase === "finished" ? `${score} złapanych!` : "Łap bagaż"}
            </h2>
            <p className="text-theme-muted mt-2 max-w-64 text-sm leading-relaxed">
              {phase === "finished"
                ? getResultMessage(score, misses)
                : "Masz 20 sekund. Łap uciekającą walizkę i nie stukaj w puste miejsca."}
            </p>
            <Button type="button" className="mt-6 min-w-44" onClick={startRound}>
              {phase === "finished" ? <RotateCcw size={17} /> : <Play size={17} />}
              {phase === "finished" ? "Jeszcze raz" : "Start"}
            </Button>
          </div>
        )}

        {phase === "playing" && (
          <div className="text-theme-muted pointer-events-none absolute inset-x-0 bottom-3 z-10 flex justify-center text-[10px] font-bold tracking-wider uppercase">
            Seria {streak} · Pudła {misses}
          </div>
        )}
      </div>

      <p className="text-theme-muted px-2 text-center text-[11px] leading-relaxed">
        Gra działa bez internetu. Rekord zostaje wyłącznie na tym urządzeniu i nie wpływa na
        punktację wyjazdu.
      </p>
      <span className="sr-only" aria-live="polite">
        {phase === "finished" ? `Koniec rundy. Wynik ${score}.` : ""}
      </span>
    </section>
  );
}

function GameStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Trophy;
  label: string;
  value: string | number;
}) {
  return (
    <div className="bg-theme-card border-theme-border flex min-h-17 flex-col justify-center rounded-2xl border px-3">
      <span className="text-theme-muted flex items-center gap-1.5 text-[9px] font-bold tracking-wider uppercase">
        <Icon size={13} /> {label}
      </span>
      <strong className="font-heading text-theme-text mt-0.5 text-xl font-semibold">{value}</strong>
    </div>
  );
}

function getResultMessage(score: number, misses: number) {
  if (score >= 24) return `Walizkowy refleks mistrzowski. Puste kliknięcia: ${misses}.`;
  if (score >= 16) return `Bardzo dobry lotniskowy refleks. Puste kliknięcia: ${misses}.`;
  if (score >= 8) return `Bagaż prawie nie miał szans. Puste kliknięcia: ${misses}.`;
  return `Rozgrzewka zaliczona. Puste kliknięcia: ${misses}.`;
}
