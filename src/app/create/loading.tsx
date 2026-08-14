import { Skeleton } from "~/components/ui/skeleton";

export default function CreateTripLoading() {
  return (
    <div
      className="flex min-h-dvh w-full flex-col items-center px-4 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)] sm:justify-center"
      aria-label="Ładowanie kreatora wyjazdu"
      aria-busy="true"
    >
      <div className="flex w-full max-w-md flex-col gap-6">
        <div>
          <div className="text-theme-muted flex justify-between text-[10px] font-bold tracking-widest uppercase">
            <span>Krok 1</span>
            <span>Konfiguracja</span>
          </div>
          <div className="bg-theme-text/10 mt-2 h-1.5 overflow-hidden rounded-full">
            <div className="bg-theme-primary h-full w-1/6 rounded-full" />
          </div>
        </div>

        <header className="flex flex-col gap-2">
          <p className="text-theme-primary text-xs font-bold tracking-widest uppercase">
            Zacznij od najważniejszego
          </p>
          <h1 className="font-heading text-theme-text text-4xl leading-tight font-semibold">
            Dokąd jedziecie?
          </h1>
          <p className="text-theme-muted text-sm">
            Nazwa wystarczy, żeby utworzyć wyjazd. Resztę możesz pominąć i uzupełnić później.
          </p>
        </header>

        <div className="flex flex-col gap-5" aria-hidden="true">
          <Skeleton className="h-12 w-full rounded-xl" />

          <div className="border-theme-border flex flex-col gap-3 rounded-2xl border p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-36 rounded-md" />
                <Skeleton className="h-3 w-52 max-w-full rounded-md" />
              </div>
            </div>
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>

          <div className="border-theme-border flex flex-col gap-3 rounded-2xl border p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-20 rounded-md" />
                <Skeleton className="h-3 w-56 max-w-full rounded-md" />
              </div>
            </div>
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <Skeleton className="h-11 w-full rounded-xl" />
            <Skeleton className="h-11 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
