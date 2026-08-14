import { Skeleton } from "~/components/ui/skeleton";

export function ShoppingPageLoading() {
  return (
    <div className="animate-fade-in -mx-2 -mb-[calc(8.5rem+env(safe-area-inset-bottom))] pt-4">
      <section
        data-bottom-nav-tone="light"
        className="shopping-notebook pb-[calc(8.5rem+env(safe-area-inset-bottom))] shadow-none"
      >
        <span className="bg-theme-primary/45 absolute inset-y-0 left-6 w-px" />

        <div className="absolute top-4 left-0 flex w-full justify-around px-8">
          {[0, 1, 2, 3, 4, 5].map((hole) => (
            <span
              key={hole}
              className="bg-theme-bg border-theme-border h-2 w-2 rounded-full border"
            />
          ))}
        </div>

        <header className="px-5 pt-12 pb-4 pl-11">
          <h1 className="font-heading text-theme-text text-3xl font-semibold">Lista zakupów</h1>
          <div className="mt-3 flex min-h-8 items-center text-xs">
            <Skeleton className="bg-theme-muted/20 h-4 w-24 rounded-md" />
          </div>
        </header>

        <div className="border-theme-border/55 border-y px-5 py-3 pl-11">
          <div className="border-theme-border/80 bg-theme-bg/18 divide-theme-border/70 divide-y overflow-hidden rounded-xl border">
            <div className="flex min-h-12 items-center pl-3">
              <Skeleton className="bg-theme-muted/20 h-5 w-36 rounded" />
            </div>
            <div className="flex min-h-10 items-center gap-2 px-3">
              <Skeleton className="bg-theme-muted/15 h-3.5 w-52 rounded" />
            </div>
          </div>
        </div>

        <div className="px-5 pt-4 pb-3 pl-11">
          <section className="py-2">
            <div className="mb-2 flex min-h-11 flex-col justify-center gap-1.5">
              <Skeleton className="bg-theme-muted/20 h-4 w-44 rounded" />
              <Skeleton className="bg-theme-muted/15 h-3 w-32 rounded" />
            </div>
            <div className="divide-theme-border/55 divide-y">
              {[1, 2, 3].map((index) => (
                <article key={index} className="flex min-h-14 items-center gap-1.5 py-2">
                  <div className="flex h-10 w-8 shrink-0 items-center justify-center">
                    <Skeleton className="bg-theme-muted/20 size-4.25 rounded-full" />
                  </div>
                  <div className="min-w-0 flex-1 py-1">
                    <Skeleton
                      className="bg-theme-muted/20 h-5 rounded"
                      style={{ width: index === 1 ? "65%" : index === 2 ? "40%" : "75%" }}
                    />
                  </div>
                  <div className="flex size-10 shrink-0 items-center justify-center">
                    <Skeleton className="bg-theme-muted/15 size-4 rounded-full" />
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
