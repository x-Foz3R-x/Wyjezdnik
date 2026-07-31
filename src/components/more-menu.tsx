"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Backpack,
  CalendarDays,
  Check,
  ChevronRight,
  Copy,
  Download,
  Gamepad2,
  Music2,
  ReceiptText,
  Route,
  Settings2,
  Share2,
  ShoppingBasket,
  Sparkles,
  UserRoundCog,
  type LucideIcon,
} from "lucide-react";
import { TRIP_MODULES, type TripModuleKey } from "~/lib/trip-config";
import { useTripRoute } from "~/providers/trip-route-provider";
import { Avatar } from "~/components/ui/avatar";
import { ResponsiveDialog } from "~/components/responsive-dialog";
import { cn } from "~/lib/utils";
import { usePwaInstall } from "~/components/pwa/pwa-provider";

const ICONS: Record<TripModuleKey, LucideIcon> = {
  schedule: CalendarDays,
  shopping: ShoppingBasket,
  scoreboard: Gamepad2,
  finances: ReceiptText,
  packing: Backpack,
  quests: Sparkles,
};

export function MoreMenu({ onNavigate }: { onNavigate?: () => void }) {
  const { showInstallAction, requestInstall } = usePwaInstall();
  const [feedback, setFeedback] = useState<"link" | "pin" | null>(null);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const {
    isAdmin,
    layout,
    modules,
    playlists,
    shareAccess,
    tripName,
    urlKey,
    userAvatarUrl,
    userId,
    userName,
  } = useTripRoute();
  const enabledModules = [
    ...layout.navigation
      .map((key) => TRIP_MODULES.find((module) => module.key === key))
      .filter((module): module is (typeof TRIP_MODULES)[number] => Boolean(module)),
    ...TRIP_MODULES.filter(
      (module) =>
        module.key !== "quests" &&
        module.key !== "packing" &&
        modules[module.key] &&
        !layout.navigation.includes(module.key as (typeof layout.navigation)[number]),
    ),
  ];
  const participant = {
    id: userId ?? userName ?? "participant",
    name: userName ?? "Uczestnik",
    avatarUrl: userAvatarUrl,
  };
  const actionGrid = shareAccess ? "grid-cols-4" : "grid-cols-3";

  const showFeedback = (value: "link" | "pin") => {
    setFeedback(value);
    window.setTimeout(() => setFeedback(null), 1800);
  };

  const copyPin = async () => {
    if (!shareAccess) return;

    try {
      await navigator.clipboard.writeText(shareAccess.joinPin);
      showFeedback("pin");
    } catch {
      // Brak uprawnień schowka nie powinien zamykać drawera ani wywoływać błędu Nexta.
    }
  };

  const shareInvite = async () => {
    if (!shareAccess) return;
    const inviteUrl = `${window.location.origin}/join/${shareAccess.inviteToken}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: `Dołącz do wyjazdu ${tripName}`, url: inviteUrl });
        return;
      } catch (error) {
        if (error && typeof error === "object" && "name" in error && error.name === "AbortError") {
          return;
        }
      }
    }

    try {
      await navigator.clipboard.writeText(inviteUrl);
      showFeedback("link");
    } catch {
      // Udostępnianie jest akcją pomocniczą — błąd systemowego arkusza nie może wywracać UI.
    }
  };

  const copyInvite = async () => {
    if (!shareAccess) return;

    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/join/${shareAccess.inviteToken}`,
      );
      showFeedback("link");
    } catch {
      // Brak dostępu do schowka nie powinien wywoływać błędu całej aplikacji.
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <section className="flex items-center gap-3 px-1 py-1">
        <Avatar user={participant} className="h-12 w-12 text-lg" />
        <div className="min-w-0 flex-1">
          <p className="text-theme-text truncate font-bold">{participant.name}</p>
          <p className="text-theme-muted truncate text-xs">
            {isAdmin ? "Zarządca" : "Uczestnik"} · {tripName}
          </p>
        </div>
      </section>

      {enabledModules.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <p className="text-theme-muted px-1 text-[10px] font-bold tracking-[0.16em] uppercase">
            Przejdź do
          </p>
          <div className="bg-theme-card border-theme-border divide-theme-border divide-y overflow-hidden rounded-2xl border">
            {enabledModules.map((module) => {
              const Icon = ICONS[module.key];
              return (
                <Link
                  key={module.key}
                  href={`/t/${urlKey}${module.href ?? ""}`}
                  onClick={onNavigate}
                  className="hover:bg-theme-primary/5 flex min-h-16 items-center gap-3 px-3.5 py-3 transition active:scale-99"
                >
                  <span className="bg-theme-primary/10 text-theme-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
                    <Icon size={18} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="text-theme-text block truncate text-sm font-bold">
                      {module.shortName}
                    </span>
                    <span className="text-theme-muted mt-0.5 block truncate text-[11px]">
                      {module.description}
                    </span>
                  </span>
                  <ChevronRight className="text-theme-muted shrink-0" size={17} />
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {playlists.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <p className="text-theme-muted px-1 text-[10px] font-bold tracking-[0.16em] uppercase">
            Playlisty
          </p>
          <div className="bg-theme-card border-theme-border divide-theme-border divide-y overflow-hidden rounded-2xl border">
            {playlists.map((playlist) => (
              <a
                key={playlist.id}
                href={playlist.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onNavigate}
                className="hover:bg-theme-primary/5 flex min-h-14 items-center gap-3 px-3.5 py-2.5 transition active:scale-99"
              >
                <span className="bg-theme-accent/10 text-theme-accent flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
                  <Music2 size={16} />
                </span>
                <span className="text-theme-text min-w-0 flex-1 truncate text-sm font-bold">
                  {playlist.name}
                </span>
                <ChevronRight className="text-theme-muted shrink-0" size={17} />
              </a>
            ))}
          </div>
        </section>
      )}

      {showInstallAction && (
        <button
          type="button"
          onClick={() => {
            void requestInstall();
            onNavigate?.();
          }}
          className="bg-theme-card border-theme-border text-theme-text flex min-h-14 w-full items-center gap-3 rounded-2xl border px-4 text-left"
        >
          <span className="bg-theme-primary/10 text-theme-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
            <Download size={17} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold">Zainstaluj aplikację</span>
            <span className="text-theme-muted mt-0.5 block text-[11px]">
              Otwieraj Wyjezdnika bezpośrednio z telefonu
            </span>
          </span>
          <ChevronRight className="text-theme-muted shrink-0" size={17} />
        </button>
      )}

      <section className="bg-theme-bg border-theme-border sticky -bottom-6 z-20 -mx-6 mt-1 -mb-6 border-t px-5 pt-3 pb-2 shadow-[0_-18px_28px_var(--theme-bg)]">
        <div className={cn("grid gap-1", actionGrid)}>
          <ActionLink
            href={`/t/${urlKey}/join`}
            icon={UserRoundCog}
            label="Zmień osobę"
            onClick={onNavigate}
          />
          <ActionLink
            href={`/?returnTo=${encodeURIComponent(`/t/${urlKey}`)}`}
            icon={Route}
            label="Inny wyjazd"
            onClick={onNavigate}
          />
          {shareAccess && (
            <ActionButton icon={Share2} label="Zaproś" onClick={() => setIsInviteOpen(true)} />
          )}
          <ActionLink
            href={`/t/${urlKey}/settings`}
            icon={Settings2}
            label="Ustawienia"
            onClick={onNavigate}
          />
        </div>
      </section>

      <ResponsiveDialog
        isOpen={isInviteOpen && Boolean(shareAccess)}
        setIsOpen={setIsInviteOpen}
        title="Zaproś ekipę"
        description="Udostępnij link albo podaj komuś 6-cyfrowy PIN wyjazdu."
      >
        {shareAccess && (
          <div className="flex flex-col gap-4">
            <section className="bg-theme-card border-theme-border rounded-2xl border p-4">
              <p className="text-theme-muted text-[10px] font-bold tracking-[0.16em] uppercase">
                PIN wyjazdu
              </p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <span className="text-theme-text font-mono text-2xl font-bold tracking-[0.22em]">
                  {shareAccess.joinPin}
                </span>
                <button
                  type="button"
                  onClick={() => void copyPin()}
                  className="border-theme-border text-theme-muted hover:text-theme-text flex min-h-11 items-center gap-2 rounded-xl border px-3 text-xs font-bold transition"
                >
                  {feedback === "pin" ? <Check size={16} /> : <Copy size={16} />}
                  {feedback === "pin" ? "Skopiowano" : "Kopiuj"}
                </button>
              </div>
            </section>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => void shareInvite()}
                className="bg-theme-card border-theme-border text-theme-text flex min-h-12 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-bold transition active:scale-98"
              >
                <Share2 size={17} /> Udostępnij
              </button>
              <button
                type="button"
                onClick={() => void copyInvite()}
                className="bg-theme-card border-theme-border text-theme-text flex min-h-12 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-bold transition active:scale-98"
              >
                {feedback === "link" ? <Check size={17} /> : <Copy size={17} />}
                {feedback === "link" ? "Skopiowano" : "Kopiuj link"}
              </button>
            </div>
          </div>
        )}
      </ResponsiveDialog>
    </div>
  );
}

function ActionLink({
  href,
  icon: Icon,
  label,
  onClick,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="text-theme-muted hover:text-theme-text flex min-h-18 flex-col items-center justify-start gap-1.5 rounded-xl pt-1 text-center transition active:scale-95"
    >
      <span className="bg-theme-card border-theme-border flex h-10 w-10 items-center justify-center rounded-2xl border">
        <Icon size={18} />
      </span>
      <span className="flex min-h-6 items-start text-[9px] leading-tight font-bold">{label}</span>
    </Link>
  );
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-theme-muted hover:text-theme-text flex min-h-18 flex-col items-center justify-start gap-1.5 rounded-xl pt-1 text-center transition active:scale-95"
    >
      <span className="bg-theme-card border-theme-border flex h-10 w-10 items-center justify-center rounded-2xl border">
        <Icon size={18} />
      </span>
      <span className="flex min-h-6 items-start text-[9px] leading-tight font-bold">{label}</span>
    </button>
  );
}
