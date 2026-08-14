"use client";

import { useState } from "react";
import { ChevronRight, UsersRound } from "lucide-react";
import { ResponsiveDialog } from "~/components/ui/responsive-dialog";
import { Avatar } from "~/components/ui/avatar";

export type DashboardParticipant = {
  id: string;
  name: string;
  avatarUrl: string | null;
  isAdmin: boolean;
  lastSeenAt: string | null;
  team: { name: string; color: string | null } | null;
};

export function ParticipantsWidget({
  participants,
  currentParticipantId,
  nowTimestamp,
}: {
  participants: DashboardParticipant[];
  currentParticipantId: string;
  nowTimestamp: number;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const visibleParticipants = participants.slice(0, 3);
  const remainingParticipants = participants.length - visibleParticipants.length;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="bg-theme-card border-theme-border flex min-h-28 min-w-0 flex-col justify-between rounded-2xl border p-4 text-left transition active:scale-98"
      >
        <span className="flex items-center justify-between gap-2">
          <span className="text-theme-primary flex min-w-0 items-center gap-2">
            <UsersRound size={17} />
            <span className="truncate text-[10px] font-bold tracking-[0.14em] uppercase">
              Ekipa
            </span>
          </span>
          <ChevronRight className="text-theme-muted shrink-0" size={17} />
        </span>

        <span className="mt-4 flex items-end justify-between gap-2">
          <span className="flex min-w-0 -space-x-2">
            {visibleParticipants.map((participant) => (
              <Avatar
                key={participant.id}
                user={participant}
                className="border-theme-card size-9 border-2 text-xs"
              />
            ))}
            {remainingParticipants > 0 && (
              <span className="bg-theme-card-raised border-theme-card text-theme-muted relative flex size-9 items-center justify-center rounded-full border-2 text-[9px] font-bold">
                +{remainingParticipants}
              </span>
            )}
          </span>
          <strong className="text-theme-text shrink-0 text-sm">{participants.length}</strong>
        </span>
      </button>

      <ResponsiveDialog
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        title={`Ekipa · ${participants.length}`}
        description="Osoby dołączone do tego wyjazdu."
      >
        <div className="border-theme-border divide-theme-border divide-y overflow-hidden rounded-2xl border">
          {participants.map((participant) => (
            <div key={participant.id} className="flex min-h-17 items-center gap-3 px-3 py-2.5">
              <Avatar user={participant} className="size-10 text-sm" />
              <div className="min-w-0 flex-1">
                <p className="text-theme-text truncate text-sm font-bold">
                  {participant.name}
                  {participant.id === currentParticipantId && (
                    <span className="text-theme-muted ml-1.5 text-[9px] uppercase">Ty</span>
                  )}
                  {participant.isAdmin && (
                    <span className="text-theme-primary ml-1.5 text-[9px] uppercase">Zarządca</span>
                  )}
                </p>
                <p className="text-theme-muted mt-0.5 truncate text-[10px]">
                  {formatLastSeen(participant.lastSeenAt, nowTimestamp)}
                </p>
                {participant.team && (
                  <p className="text-theme-muted mt-1 flex items-center gap-1.5 truncate text-[10px]">
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{
                        backgroundColor: participant.team.color ?? "var(--theme-primary)",
                      }}
                    />
                    {participant.team.name}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </ResponsiveDialog>
    </>
  );
}

function formatLastSeen(value: string | null, nowTimestamp: number) {
  if (!value) return "Jeszcze niewidziany w aplikacji";

  const seenAt = new Date(value);
  const difference = Math.max(0, nowTimestamp - seenAt.getTime());
  if (difference < 2 * 60_000) return "Widziany niedawno";

  const minutes = Math.floor(difference / 60_000);
  if (minutes < 60) return `Widziany ${minutes} min temu`;

  const hours = Math.floor(difference / 3_600_000);
  if (hours < 24) return `Widziany ${hours} godz. temu`;

  const days = Math.floor(difference / 86_400_000);
  if (days === 1) return "Widziany wczoraj";
  if (days < 7) return `Widziany ${days} dni temu`;

  return `Widziany ${seenAt.toLocaleDateString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })}`;
}
