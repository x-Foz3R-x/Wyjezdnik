import { Skeleton } from "~/components/ui/skeleton";

export default function TripLoading() {
  return (
    <div
      className="flex min-h-dvh flex-col gap-6 px-4 pt-[calc(env(safe-area-inset-top)+1rem)] pb-[calc(env(safe-area-inset-bottom)+1rem)]"
      aria-label="Ładowanie wyjazdu"
      aria-busy="true"
    >
      <Skeleton className="h-14 w-3/4 rounded-xl" />
      <Skeleton className="h-28 w-full rounded-2xl" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
      </div>
      <Skeleton className="h-40 w-full rounded-2xl" />
    </div>
  );
}
