import { getTripActionContext } from "~/lib/server/trip-action-context";

export async function getAdminTripActionContext(tripKey: string) {
  const context = await getTripActionContext(tripKey);
  return context?.participant.is_admin ? context : null;
}

export function getClosedTripError(context: { isClosed: boolean }) {
  return context.isClosed
    ? {
        ok: false as const,
        error: "Ten wyjazd jest zamknięty. Zarządca może go ponownie otworzyć w ustawieniach.",
      }
    : null;
}
