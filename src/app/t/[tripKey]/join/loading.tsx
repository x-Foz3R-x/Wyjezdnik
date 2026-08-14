import { Skeleton } from "~/components/ui/skeleton";

export default function JoinTripLoading() {
  return (
    <div
      className="flex min-h-dvh items-center justify-center px-4 pt-[calc(env(safe-area-inset-top)+2rem)] pb-[calc(env(safe-area-inset-bottom)+7rem)]"
      aria-label="Ładowanie uczestników wyjazdu"
      aria-busy="true"
    >
      <div className="flex w-full max-w-md flex-col items-center gap-6 text-center">
        <div className="flex w-full flex-col items-center gap-2">
          <p className="text-theme-muted text-[10px] font-bold tracking-widest uppercase">
            Dołączasz do
          </p>
          <Skeleton className="h-9 w-2/3 rounded-lg" />
          <p className="text-theme-muted mt-1 text-sm">Wybierz siebie z listy uczestników.</p>
        </div>
        <div className="mt-4 grid w-full grid-cols-2 gap-3" aria-hidden="true">
          {[0, 1, 2, 3, 4, 5].map((participant) => (
            <div
              key={participant}
              className="border-theme-border bg-theme-card flex min-h-16 items-center gap-3 rounded-xl border p-3"
            >
              <Skeleton className="size-10 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1">
                <Skeleton className="h-4 w-4/5 rounded" />
                <Skeleton className="mt-2 h-2 w-3/5 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
