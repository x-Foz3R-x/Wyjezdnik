import { CalendarDays, Dices, Flag, Gamepad2, ReceiptText, Trophy, Vote } from "lucide-react";
import { Skeleton } from "~/components/ui/skeleton";

export function DashboardPageLoading() {
  return (
    <div
      className="animate-fade-in flex flex-col gap-5"
      aria-label="Ładowanie Bazy wyjazdu"
      aria-busy="true"
    >
      <header className="mt-3 px-1 pt-1">
        <p className="text-theme-primary text-[10px] font-bold tracking-[0.2em] uppercase">
          Baza wyjazdu
        </p>
        <Skeleton className="mt-2 h-11 w-3/4 rounded-xl" />
      </header>

      <div className="flex min-h-16 items-center gap-3 px-1">
        <Skeleton className="size-12 shrink-0 rounded-full" />
        <Skeleton className="h-6 w-40 rounded-lg" />
      </div>

      <section className="grid grid-cols-2 gap-3" aria-hidden="true">
        <div className="border-theme-border bg-theme-card col-span-2 min-h-36 rounded-2xl border p-4">
          <p className="text-theme-primary text-[10px] font-bold tracking-[0.16em] uppercase">
            Plan na dziś
          </p>
          <Skeleton className="mt-8 h-6 w-2/3 rounded-lg" />
          <Skeleton className="mt-3 h-4 w-2/5 rounded" />
        </div>
        <DashboardTileLoading />
        <DashboardTileLoading />
        <div className="border-theme-border bg-theme-card col-span-2 min-h-32 rounded-2xl border p-4">
          <Skeleton className="h-4 w-28 rounded" />
          <Skeleton className="mt-7 h-7 w-1/2 rounded-lg" />
          <Skeleton className="mt-3 h-4 w-3/4 rounded" />
        </div>
      </section>
    </div>
  );
}

function DashboardTileLoading() {
  return (
    <div className="border-theme-border bg-theme-card min-h-32 rounded-2xl border p-4">
      <Skeleton className="size-9 rounded-xl" />
      <Skeleton className="mt-5 h-6 w-1/2 rounded-lg" />
      <Skeleton className="mt-2 h-3 w-4/5 rounded" />
    </div>
  );
}

export function GameplayMenuLoading() {
  return (
    <div
      className="animate-fade-in flex flex-col gap-5 pt-3"
      aria-label="Ładowanie Rozrywki"
      aria-busy="true"
    >
      <header className="px-1 pt-2 pb-3">
        <p className="text-theme-accent flex items-center gap-2 text-[10px] font-bold tracking-[0.2em] uppercase">
          <Gamepad2 size={14} /> Strefa rozrywki
        </p>
        <h1 className="font-heading text-theme-text mt-2 max-w-72 text-4xl leading-[1.02] font-semibold">
          Wybierz, co dziś robimy
        </h1>
      </header>
      <section className="grid grid-cols-2 gap-3" aria-hidden="true">
        {[Dices, Vote, Flag, Trophy].map((Icon, index) => (
          <div
            key={index}
            className="border-theme-border bg-theme-card flex min-h-44 flex-col rounded-3xl border p-4"
          >
            <span className="bg-theme-muted/15 text-theme-muted flex size-11 items-center justify-center rounded-2xl">
              <Icon size={21} />
            </span>
            <div className="mt-auto">
              <Skeleton className="h-5 w-3/4 rounded" />
              <Skeleton className="mt-2 h-3 w-full rounded" />
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

export function GameplayDetailLoading({
  view,
}: {
  view: "scores" | "challenges" | "polls" | "wheel";
}) {
  const content = {
    scores: { title: "Punktacja", icon: Trophy },
    challenges: { title: "Wyzwania", icon: Flag },
    polls: { title: "Głosowania", icon: Vote },
    wheel: { title: "Koło fortuny", icon: Dices },
  }[view];
  const Icon = content.icon;

  return (
    <div
      className="animate-fade-in flex flex-col gap-5 pt-3"
      aria-label={`Ładowanie: ${content.title}`}
      aria-busy="true"
    >
      <header className="px-1 pt-1">
        <div className="text-theme-muted mb-4 flex min-h-11 items-center text-sm font-bold">
          ← Strefa rozrywki
        </div>
        <div className="flex items-center gap-3">
          <span className="bg-theme-primary/10 text-theme-primary flex size-12 items-center justify-center rounded-2xl">
            <Icon size={23} />
          </span>
          <div>
            <p className="text-theme-muted text-[10px] font-bold tracking-[0.16em] uppercase">
              Rozrywka
            </p>
            <h1 className="font-heading text-theme-text text-3xl font-semibold">{content.title}</h1>
          </div>
        </div>
      </header>
      {view === "wheel" ? (
        <div className="border-theme-border bg-theme-card flex min-h-112 flex-col items-center rounded-3xl border p-5">
          <Skeleton className="mt-4 aspect-square w-full max-w-80 rounded-full" />
          <Skeleton className="mt-8 h-12 w-full rounded-xl" />
          <div className="mt-6 grid w-full grid-cols-2 gap-2">
            <Skeleton className="h-11 rounded-xl" />
            <Skeleton className="h-11 rounded-xl" />
          </div>
        </div>
      ) : view === "scores" ? (
        <div className="flex flex-col gap-4">
          <div className="border-theme-border bg-theme-card flex min-h-64 items-end gap-3 rounded-3xl border p-5">
            {[40, 72, 55, 88].map((height) => (
              <Skeleton
                key={height}
                className="flex-1 rounded-t-xl"
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
          <Skeleton className="h-16 rounded-2xl" />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between px-1">
            <Skeleton className="h-7 w-40 rounded-lg" />
            <Skeleton className="size-11 rounded-full" />
          </div>
          {[0, 1].map((item) => (
            <div key={item} className="border-theme-border bg-theme-card rounded-3xl border p-4">
              <Skeleton className="h-3 w-28 rounded" />
              <Skeleton className="mt-3 h-7 w-3/5 rounded-lg" />
              <Skeleton className="mt-5 h-12 w-full rounded-xl" />
              <Skeleton className="mt-2 h-12 w-full rounded-xl" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function SchedulePageLoading() {
  return (
    <div
      className="animate-fade-in flex flex-col gap-6 pt-3"
      aria-label="Ładowanie harmonogramu"
      aria-busy="true"
    >
      <header className="px-1 pt-1">
        <p className="text-theme-primary flex items-center gap-2 text-[10px] font-bold tracking-[0.18em] uppercase">
          <CalendarDays size={14} /> Karta podróży
        </p>
        <h1 className="font-heading text-theme-text mt-1 text-3xl font-semibold">
          Co, gdzie, kiedy
        </h1>
        <Skeleton className="mt-3 h-3 w-52 rounded" />
      </header>
      {[0, 1].map((group) => (
        <section key={group}>
          <Skeleton className="h-3 w-20 rounded" />
          <Skeleton className="mt-2 h-7 w-32 rounded-lg" />
          <div className="mt-4 flex flex-col gap-3">
            {[0, 1].map((item) => (
              <div key={item} className="flex items-start gap-3">
                <Skeleton className="mt-2 h-4 w-12 rounded" />
                <Skeleton className="mt-2 size-3 rounded-full" />
                <div className="border-theme-border bg-theme-card min-h-20 flex-1 rounded-2xl border p-4">
                  <Skeleton className="h-5 w-2/3 rounded" />
                  <Skeleton className="mt-3 h-3 w-1/2 rounded" />
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export function FinancesPageLoading() {
  return (
    <section
      data-bottom-nav-tone="light"
      className="thermal-receipt text-receipt-ink -mx-2 mt-8 min-h-dvh px-5 py-7 font-mono"
      aria-label="Ładowanie rozliczeń"
      aria-busy="true"
    >
      <div className="text-center">
        <p className="text-[10px] tracking-[0.38em] uppercase">Wyjezdnik</p>
        <h1 className="mt-2 text-xl font-black tracking-[0.16em] uppercase">Rozliczenia wyjazdu</h1>
      </div>
      <div className="border-receipt-line/70 mt-8 border-t border-dashed pt-6">
        {[0, 1, 2].map((item) => (
          <div key={item} className="border-receipt-line/45 border-b border-dotted py-5">
            <div className="flex items-center justify-between gap-4">
              <Skeleton className="bg-receipt-ink/15 h-5 w-1/2 rounded" />
              <Skeleton className="bg-receipt-ink/15 h-5 w-20 rounded" />
            </div>
            <Skeleton className="bg-receipt-ink/10 mt-3 h-3 w-2/3 rounded" />
          </div>
        ))}
      </div>
      <div className="border-receipt-ink mt-8 border-t-3 pt-5">
        <div className="flex items-center justify-between">
          <strong className="text-lg uppercase">Suma</strong>
          <Skeleton className="bg-receipt-ink/20 h-7 w-28 rounded" />
        </div>
      </div>
      <div className="border-receipt-ink mt-6 border-t-3 pt-6">
        <ReceiptText size={20} />
        <Skeleton className="bg-receipt-ink/15 mt-4 h-6 w-44 rounded" />
        <Skeleton className="bg-receipt-ink/10 mt-4 h-16 w-full rounded" />
      </div>
    </section>
  );
}

export function SettingsPageLoading() {
  return (
    <div
      className="animate-fade-in flex flex-col gap-4 pt-3"
      aria-label="Ładowanie ustawień"
      aria-busy="true"
    >
      <header className="flex min-h-16 items-center gap-3">
        <Skeleton className="size-11 rounded-full" />
        <div>
          <h1 className="font-heading text-theme-text text-3xl font-semibold">Ustawienia</h1>
          <Skeleton className="mt-2 h-3 w-44 rounded" />
        </div>
      </header>
      <div className="border-theme-border bg-theme-card divide-theme-border divide-y overflow-hidden rounded-2xl border">
        {[0, 1, 2, 3, 4, 5].map((item) => (
          <div key={item} className="flex min-h-17 items-center gap-3 px-4 py-3">
            <Skeleton className="size-9 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1">
              <Skeleton className="h-4 w-2/5 rounded" />
              <Skeleton className="mt-2 h-3 w-3/4 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
