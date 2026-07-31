import { redirect } from "next/navigation";
import { GameplayPageContent } from "~/components/modules/scoreboard/gameplay-page-content";

const LEGACY_VIEW_ROUTES = {
  scores: "scores",
  challenges: "challenges",
  polls: "polls",
  wheel: "wheel",
  minigame: "minigame",
} as const;

export default async function GameplayPage({
  params,
  searchParams,
}: {
  params: Promise<{ tripKey: string }>;
  searchParams: Promise<{ view?: string | string[] }>;
}) {
  const [{ tripKey }, query] = await Promise.all([params, searchParams]);
  const requestedView = Array.isArray(query.view) ? query.view[0] : query.view;
  const legacyRoute =
    requestedView && requestedView in LEGACY_VIEW_ROUTES
      ? LEGACY_VIEW_ROUTES[requestedView as keyof typeof LEGACY_VIEW_ROUTES]
      : null;

  if (legacyRoute) redirect(`/t/${tripKey}/gameplay/${legacyRoute}`);

  return <GameplayPageContent tripKey={tripKey} view="menu" />;
}
