import Link from "next/link";
import { format, isToday, isTomorrow, parseISO } from "date-fns";
import { pl } from "date-fns/locale";
import {
  CalendarDays,
  ChevronRight,
  Clock3,
  Dices,
  MapPin,
  Music2,
  Navigation,
  ReceiptText,
  ShoppingBasket,
  Sparkles,
  Vote,
  type LucideIcon,
} from "lucide-react";
import { WelcomeCard } from "~/components/modules/hub/welcome-card";
import { PackingWidget } from "~/components/modules/hub/packing-widget";
import {
  ParticipantsWidget,
  type DashboardParticipant,
} from "~/components/modules/hub/participants-widget";
import { GameplayWidget } from "~/components/modules/hub/gameplay-widget";
import type { DashboardInsights } from "~/lib/server/dashboard";
import type { DashboardWidgetKey, TripModules } from "~/lib/trip-config";
import { formatFinanceAmount, type FinanceMode } from "~/lib/finances";
import { cn } from "~/lib/utils";
import type { PackingPresetItem } from "~/lib/packing";
import type { Database } from "~/types/database";
import type { CurrencyCode } from "~/lib/currencies";

const HALF_WIDGETS = new Set<DashboardWidgetKey>([
  "dates",
  "shopping",
  "finances",
  "quests",
  "polls",
  "wheel",
]);

export function Dashboard({
  participant,
  tripName,
  urlKey,
  isAdmin,
  startDate,
  endDate,
  destinationName,
  destinationAddress,
  destinationMapUrl,
  playlists,
  modules,
  financeMode,
  currency,
  dashboardWidgets,
  insights,
  packing,
  participants,
}: {
  participant: { id: string; name: string; avatarUrl?: string | null };
  tripName: string;
  urlKey: string;
  isAdmin: boolean;
  startDate: string | null;
  endDate: string | null;
  destinationName: string | null;
  destinationAddress: string | null;
  destinationMapUrl: string | null;
  playlists: Array<{ id: string; name: string; url: string }>;
  modules: TripModules;
  financeMode: FinanceMode;
  currency: CurrencyCode;
  dashboardWidgets: DashboardWidgetKey[];
  insights: DashboardInsights;
  participants: DashboardParticipant[];
  packing: {
    presetItems: PackingPresetItem[];
    states: Array<{ item_key: string; is_checked: boolean; is_hidden: boolean }>;
    personalItems: Database["public"]["Tables"]["packing_personal_items"]["Row"][];
    isReadOnly: boolean;
  };
}) {
  const mapQuery = destinationAddress ?? destinationName;
  const mapUrl =
    destinationMapUrl ??
    (mapQuery
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`
      : null);
  const dateLabel = formatTripDates(startDate, endDate);

  const visibleWidgets = dashboardWidgets.filter((widget) => {
    if (widget === "destination") return Boolean(mapQuery);
    if (widget === "dates") return Boolean(dateLabel);
    if (widget === "playlist") return playlists.length > 0;
    if (widget === "packing") return true;
    if (widget === "participants") return participants.length > 0;
    if (widget === "polls" || widget === "wheel") return modules.scoreboard;
    return modules[widget];
  });
  const compactWidgets = visibleWidgets.filter((widget) => HALF_WIDGETS.has(widget));
  const orphanCompactWidget =
    compactWidgets.length % 2 === 1 ? compactWidgets[compactWidgets.length - 1] : null;

  return (
    <div className="animate-fade-in flex flex-col gap-5">
      <header className="mt-3 px-1 pt-1">
        <p className="text-theme-primary text-[10px] font-bold tracking-[0.2em] uppercase">
          Baza wyjazdu
        </p>
        <h1 className="font-heading text-theme-text mt-1 truncate text-[2.35rem] leading-tight font-semibold">
          {tripName}
        </h1>
      </header>

      <WelcomeCard participant={participant} />

      {visibleWidgets.length > 0 ? (
        <section
          className="grid grid-flow-row-dense grid-cols-2 gap-3"
          aria-label="Podgląd wyjazdu"
        >
          {visibleWidgets.map((widget) => {
            const isWideCompact = orphanCompactWidget === widget;

            if (widget === "destination" && mapUrl) {
              return (
                <a
                  key={widget}
                  href={mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-theme-card border-theme-border col-span-2 flex min-h-28 items-center justify-between gap-4 rounded-2xl border p-4 transition active:scale-99"
                >
                  <div className="min-w-0">
                    <WidgetLabel icon={MapPin}>Cel podróży</WidgetLabel>
                    <p className="text-theme-text mt-2 truncate text-base font-bold">
                      {destinationName ?? destinationAddress}
                    </p>
                    {destinationName && destinationAddress && (
                      <p className="text-theme-muted mt-0.5 truncate text-xs">
                        {destinationAddress}
                      </p>
                    )}
                  </div>
                  <span className="bg-theme-primary/12 text-theme-primary flex h-11 w-11 shrink-0 items-center justify-center rounded-full">
                    <Navigation size={18} />
                  </span>
                </a>
              );
            }

            if (widget === "dates" && dateLabel) {
              return (
                <CompactWidget
                  key={widget}
                  icon={CalendarDays}
                  label="Termin"
                  value={dateLabel}
                  detail={tripDateProgress(startDate, endDate)}
                  wide={isWideCompact}
                />
              );
            }

            if (widget === "schedule") {
              const next = insights.schedule.next;
              return (
                <Link
                  key={widget}
                  href={`/t/${urlKey}/schedule`}
                  className="bg-theme-card border-theme-border col-span-2 flex min-h-36 flex-col justify-between rounded-2xl border p-4 transition active:scale-99"
                >
                  <div className="flex items-start justify-between gap-3">
                    <WidgetLabel icon={Clock3}>Plan na dziś</WidgetLabel>
                    <ChevronRight className="text-theme-muted" size={18} />
                  </div>
                  {next ? (
                    <div className="mt-5">
                      <p className="font-heading text-theme-text text-xl leading-tight font-semibold">
                        {next.title}
                      </p>
                      <div className="text-theme-muted mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                        <span>{formatScheduleMoment(next.eventDate, next.startTime)}</span>
                        {next.locationName && (
                          <span className="flex items-center gap-1">
                            <MapPin size={11} /> {next.locationName}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-5">
                      <p className="text-theme-text font-bold">Dzisiaj bez planu</p>
                      <p className="text-theme-muted mt-1 text-xs">
                        {isAdmin
                          ? "Możesz dodać punkt na dzisiaj."
                          : "Na dziś nie wpisano żadnego punktu."}
                      </p>
                    </div>
                  )}
                  {insights.schedule.todayCount > 1 && (
                    <p className="text-theme-primary mt-3 text-[10px] font-bold tracking-wider uppercase">
                      Dzisiaj: {insights.schedule.todayCount} punkty
                    </p>
                  )}
                </Link>
              );
            }

            if (widget === "shopping") {
              const { open, completed } = insights.shopping;
              return (
                <CompactWidget
                  key={widget}
                  href={`/t/${urlKey}/shopping`}
                  icon={ShoppingBasket}
                  label="Zakupy"
                  value={open === 0 ? "Gotowe" : String(open)}
                  detail={
                    open === 0
                      ? completed > 0
                        ? `${completed} pozycji kupionych`
                        : "Lista jest pusta"
                      : open === 1
                        ? "rzecz do kupienia"
                        : "rzeczy do kupienia"
                  }
                  progress={
                    open + completed > 0 ? Math.round((completed / (open + completed)) * 100) : 0
                  }
                  wide={isWideCompact}
                />
              );
            }

            if (widget === "finances") {
              const balance = insights.finances.balance;
              return (
                <CompactWidget
                  key={widget}
                  href={`/t/${urlKey}/finances`}
                  icon={ReceiptText}
                  label="Rozliczenia"
                  value={formatFinanceAmount(balance, financeMode, {
                    currency,
                    sign: true,
                  })}
                  detail={
                    balance > 0.009
                      ? "do odzyskania"
                      : balance < -0.009
                        ? "do oddania"
                        : insights.finances.entries > 0
                          ? "jesteś na zero"
                          : "bez wydatków"
                  }
                  wide={isWideCompact}
                />
              );
            }

            if (widget === "scoreboard") {
              return <GameplayWidget key={widget} insight={insights.scoreboard} />;
            }

            if (widget === "quests") {
              const count = insights.scoreboard.activeChallenges;
              return (
                <CompactWidget
                  key={widget}
                  href={`/t/${urlKey}/gameplay/challenges`}
                  icon={Sparkles}
                  label="Wyzwania"
                  value={count === 0 ? "Cisza" : String(count)}
                  detail={
                    count === 0
                      ? "Brak aktywnych zadań"
                      : count === 1
                        ? "aktywne wyzwanie"
                        : "aktywne wyzwania"
                  }
                  wide={isWideCompact}
                />
              );
            }

            if (widget === "polls") {
              const count = insights.scoreboard.openPolls;
              const activePoll = insights.scoreboard.activePoll;
              return (
                <CompactWidget
                  key={widget}
                  href={`/t/${urlKey}/gameplay/polls`}
                  icon={Vote}
                  label="Głosowania"
                  value={
                    activePoll?.needsVote ? "Zagłosuj!" : count === 0 ? "Spokój" : String(count)
                  }
                  detail={
                    activePoll?.needsVote
                      ? activePoll.question
                      : count === 0
                        ? "Nic nie czeka na głos"
                        : "decyzje czekają na ekipę"
                  }
                  attention={Boolean(activePoll?.needsVote)}
                  wide={isWideCompact}
                />
              );
            }

            if (widget === "wheel") {
              return (
                <CompactWidget
                  key={widget}
                  href={`/t/${urlKey}/gameplay/wheel`}
                  icon={Dices}
                  label="Koło fortuny"
                  value="Losuj"
                  detail={`${insights.scoreboard.participants} osób w puli`}
                  wide={isWideCompact}
                />
              );
            }

            if (widget === "packing") {
              return <PackingWidget key={widget} {...packing} />;
            }

            if (widget === "playlist") {
              return (
                <section
                  key={widget}
                  className="bg-theme-card border-theme-border col-span-2 rounded-2xl border p-4"
                >
                  <WidgetLabel icon={Music2}>Playlisty</WidgetLabel>
                  {playlists.length > 0 ? (
                    <div className="border-theme-border divide-theme-border mt-3 flex flex-col divide-y border-t">
                      {playlists.slice(0, 3).map((playlist) => (
                        <a
                          key={playlist.id}
                          href={playlist.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-theme-text flex min-h-12 items-center justify-between gap-3 py-2 text-sm font-bold active:opacity-60"
                        >
                          <span className="truncate">{playlist.name}</span>
                          <ChevronRight className="text-theme-muted shrink-0" size={16} />
                        </a>
                      ))}
                    </div>
                  ) : (
                    <div className="border-theme-border mt-3 border-t pt-3">
                      <p className="text-theme-text text-sm font-bold">Jeszcze bez soundtracku</p>
                      <p className="text-theme-muted mt-1 text-xs">
                        {isAdmin
                          ? "Dodaj pierwszą playlistę w ustawieniach."
                          : "Zarządca nie dodał jeszcze playlisty."}
                      </p>
                      {isAdmin && (
                        <Link
                          href={`/t/${urlKey}/settings`}
                          className="text-theme-primary mt-3 inline-flex text-xs font-bold"
                        >
                          Dodaj playlistę
                        </Link>
                      )}
                    </div>
                  )}
                  {playlists.length > 3 && (
                    <p className="text-theme-muted mt-2 text-[10px]">
                      I jeszcze {playlists.length - 3} playlisty
                    </p>
                  )}
                </section>
              );
            }

            if (widget === "participants") {
              return (
                <ParticipantsWidget
                  key={widget}
                  participants={participants}
                  currentParticipantId={participant.id}
                  nowTimestamp={Date.now()}
                />
              );
            }

            return null;
          })}
        </section>
      ) : (
        <section className="border-theme-border flex flex-col items-center gap-3 rounded-2xl border border-dashed p-8 text-center">
          <p className="text-theme-muted text-sm">Baza czeka na pierwsze widżety.</p>
          {isAdmin && (
            <Link href={`/t/${urlKey}/settings`} className="text-theme-primary text-sm font-bold">
              Ustaw zawartość Bazy
            </Link>
          )}
        </section>
      )}
    </div>
  );
}

function CompactWidget({
  icon: Icon,
  label,
  value,
  detail,
  href,
  wide,
  color,
  progress,
  attention = false,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
  href?: string;
  wide: boolean;
  color?: string;
  progress?: number;
  attention?: boolean;
}) {
  const className = cn(
    "bg-theme-card border-theme-border relative flex h-36 min-w-0 flex-col overflow-hidden rounded-2xl border p-4",
    href && "transition active:scale-98",
    wide && "col-span-2",
    attention && "border-theme-accent/60 bg-theme-accent/8 shadow-[0_0_0_1px_var(--theme-accent)]",
  );
  const content = (
    <>
      <span
        className="bg-theme-primary/7 pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full blur-xl"
        style={color ? { backgroundColor: `${color}18` } : undefined}
      />
      <div className="relative flex items-start justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2">
          <span
            className="bg-theme-primary/10 text-theme-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
            style={color ? { color, backgroundColor: `${color}1f` } : undefined}
          >
            <Icon size={16} />
          </span>
          <span className="text-theme-muted truncate text-[9px] font-bold tracking-wider uppercase">
            {label}
          </span>
        </span>
        {href && <ChevronRight className="text-theme-muted/70" size={16} />}
      </div>
      <div className="relative mt-auto min-w-0 pt-3">
        <p className="font-heading text-theme-text truncate text-[1.35rem] leading-tight font-semibold">
          {value}
        </p>
        <p className="text-theme-muted mt-0.5 truncate text-xs">{detail}</p>
        {progress !== undefined && (
          <div className="bg-theme-bg/70 mt-2 h-1.5 overflow-hidden rounded-full">
            <div
              className="bg-theme-primary h-full rounded-full transition-all"
              style={{ width: `${Math.max(0, Math.min(progress, 100))}%` }}
            />
          </div>
        )}
      </div>
    </>
  );

  return href ? (
    <Link href={href} className={className}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
}

function WidgetLabel({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <span className="text-theme-primary flex items-center gap-1.5 text-[10px] font-bold tracking-[0.14em] uppercase">
      <Icon size={13} /> {children}
    </span>
  );
}

function formatTripDates(startDate: string | null, endDate: string | null) {
  if (!startDate && !endDate) return null;
  if (startDate && endDate) {
    return `${format(parseISO(startDate), "d MMM", { locale: pl })} – ${format(parseISO(endDate), "d MMM", { locale: pl })}`;
  }
  return format(parseISO(startDate ?? endDate!), "d MMMM", { locale: pl });
}

function tripDateProgress(startDate: string | null, endDate: string | null) {
  if (!startDate && !endDate) return "Termin do ustalenia";
  const today = new Date();
  const start = startDate ? parseISO(startDate) : null;
  const end = endDate ? parseISO(endDate) : start;
  if (start && today < start) {
    const days = Math.max(1, Math.ceil((start.getTime() - today.getTime()) / 86_400_000));
    return days === 1 ? "start już jutro" : `start za ${days} dni`;
  }
  if (end && today > new Date(end.getTime() + 86_400_000)) return "wyjazd zakończony";
  return "wyjazd trwa";
}

function formatScheduleMoment(eventDate: string, startTime: string | null) {
  const date = parseISO(eventDate);
  const day = isToday(date)
    ? "Dzisiaj"
    : isTomorrow(date)
      ? "Jutro"
      : format(date, "EEE, d MMM", { locale: pl });
  return startTime ? `${day}, ${startTime.slice(0, 5)}` : day;
}
