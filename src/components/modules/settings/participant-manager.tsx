"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Eye, EyeOff, KeyRound, Pencil, Plus, Trash2, Trophy } from "lucide-react";
import {
  addParticipantAction,
  deleteParticipantAction,
  updateParticipantAction,
} from "~/app/actions/trips";
import { SettingsCard, SettingsDisclosure } from "~/components/modules/settings/settings-layout";
import { TeamManager } from "~/components/modules/settings/team-manager";
import type { ManagedParticipant, ManagedTeam } from "~/components/modules/settings/settings-types";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { ResponsiveDialog } from "~/components/ui/responsive-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { runClientAction } from "~/lib/client-action";
import { announceNavigationStart } from "~/lib/navigation-feedback";
import { cn } from "~/lib/utils";

export function ParticipantManager({
  tripKey,
  currentUserId,
  participants,
  teams,
  teamsEnabled,
  activityNow,
}: {
  tripKey: string;
  currentUserId: string;
  participants: ManagedParticipant[];
  teams: ManagedTeam[];
  teamsEnabled: boolean;
  activityNow: number;
}) {
  const router = useRouter();
  const [editor, setEditor] = useState<{ userId: string | null } | null>(null);
  const [name, setName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revealedPins, setRevealedPins] = useState<Set<string>>(new Set());

  const openEditor = (participant?: ManagedParticipant) => {
    setError(null);
    setName(participant?.name ?? "");
    setIsAdmin(participant?.isAdmin ?? false);
    setTeamId(participant?.teamId ?? null);
    setEditor({ userId: participant?.id ?? null });
  };

  const save = async () => {
    setIsSaving(true);
    setError(null);
    const result = await runClientAction(
      () =>
        editor?.userId
          ? updateParticipantAction({
              tripKey,
              userId: editor.userId,
              name,
              isAdmin,
              teamId,
            })
          : addParticipantAction({ tripKey, name, isAdmin, teamId }),
      "Nie udało się zapisać uczestnika.",
    );
    setIsSaving(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setEditor(null);
    router.refresh();
  };

  const remove = async (participant: ManagedParticipant) => {
    if (!window.confirm(`Usunąć uczestnika ${participant.name}?`)) return;
    setIsSaving(true);
    setError(null);
    const result = await runClientAction(
      () => deleteParticipantAction({ tripKey, userId: participant.id }),
      "Nie udało się usunąć uczestnika.",
    );
    setIsSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-5">
      {(teamsEnabled || teams.length > 0) && (
        <SettingsDisclosure
          title={
            teams.length > 0 ? `Drużyny do punktacji · ${teams.length}` : "Drużyny do punktacji"
          }
          description="Opcjonalny podział używany tylko w Rozrywce"
          icon={Trophy}
        >
          <TeamManager tripKey={tripKey} teams={teams} participants={participants} />
        </SettingsDisclosure>
      )}

      <SettingsCard>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-theme-text text-sm font-bold">Ekipa · {participants.length}</h2>
            <p className="text-theme-muted mt-0.5 text-xs">Profile dostępne przy dołączaniu.</p>
          </div>
          <Button type="button" size="sm" onClick={() => openEditor()} className="gap-1.5">
            <Plus size={16} /> Dodaj
          </Button>
        </div>

        {error && (
          <p className="border-theme-danger/30 bg-theme-danger/10 text-theme-danger rounded-xl border px-3 py-2 text-xs font-bold">
            {error}
          </p>
        )}

        <div className="border-theme-border divide-theme-border divide-y overflow-hidden rounded-xl border px-3">
          {participants.map((participant) => {
            const revealed = revealedPins.has(participant.id);
            return (
              <div key={participant.id} className="flex min-h-19 items-center gap-2 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-theme-text truncate text-sm font-bold">
                    {participant.name}
                    {participant.id === currentUserId && (
                      <span className="text-theme-muted ml-1.5 text-[9px] uppercase">Ty</span>
                    )}
                    {participant.isAdmin && (
                      <span className="text-theme-primary ml-1.5 text-[9px] tracking-wider uppercase">
                        Zarządca
                      </span>
                    )}
                  </p>
                  <p className="text-theme-muted mt-0.5 truncate text-[10px]">
                    {formatLastSeen(participant.lastSeenAt, activityNow)}
                  </p>
                  {participant.teamId && (
                    <p className="text-theme-muted mt-1 flex items-center gap-1.5 truncate text-[10px]">
                      <span
                        className="size-2 rounded-full"
                        style={{
                          backgroundColor:
                            teams.find((team) => team.id === participant.teamId)?.color ??
                            "var(--theme-muted)",
                        }}
                      />
                      {teams.find((team) => team.id === participant.teamId)?.name ??
                        "Nieznana drużyna"}
                    </p>
                  )}
                  {revealed && (
                    <p className="text-theme-muted mt-1 font-mono text-xs tracking-[0.2em]">
                      {participant.userPin ?? "Nie ustawiono"}
                    </p>
                  )}
                </div>

                {participant.userPin && (
                  <button
                    type="button"
                    onClick={() =>
                      setRevealedPins((current) => {
                        const next = new Set(current);
                        if (next.has(participant.id)) next.delete(participant.id);
                        else next.add(participant.id);
                        return next;
                      })
                    }
                    className="text-theme-muted hover:text-theme-text flex h-10 w-10 items-center justify-center"
                    aria-label={
                      revealed ? `Ukryj PIN ${participant.name}` : `Pokaż PIN ${participant.name}`
                    }
                  >
                    {revealed ? <EyeOff size={16} /> : <KeyRound size={16} />}
                  </button>
                )}
                {participant.id !== currentUserId && (
                  <button
                    type="button"
                    onClick={() => {
                      announceNavigationStart();
                      router.push(`/t/${tripKey}/finances?viewAs=${participant.id}`);
                    }}
                    className="text-theme-muted hover:text-theme-text flex h-10 w-10 items-center justify-center"
                    aria-label={`Podejrzyj rozliczenia ${participant.name}`}
                  >
                    <Eye size={16} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => openEditor(participant)}
                  className="text-theme-muted hover:text-theme-text flex h-10 w-10 items-center justify-center"
                  aria-label={`Edytuj ${participant.name}`}
                >
                  <Pencil size={16} />
                </button>
                {participant.id !== currentUserId && (
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => void remove(participant)}
                    className="text-theme-muted hover:text-theme-danger flex h-10 w-10 items-center justify-center disabled:opacity-40"
                    aria-label={`Usuń ${participant.name}`}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <ResponsiveDialog
          isOpen={editor !== null}
          setIsOpen={(open) => !open && setEditor(null)}
          title={editor?.userId ? "Edytuj uczestnika" : "Nowy uczestnik"}
          description="PIN uczestnika ustawi on sam przy pierwszym wejściu."
        >
          <div className="flex flex-col gap-4">
            {error && (
              <p className="border-theme-danger/30 bg-theme-danger/10 text-theme-danger rounded-xl border px-3 py-2 text-xs font-bold">
                {error}
              </p>
            )}
            <Input
              label="Nazwa"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoFocus
            />
            <button
              type="button"
              onClick={() => setIsAdmin((current) => !current)}
              className={cn(
                "border-theme-border flex min-h-12 items-center justify-between rounded-xl border px-3 text-left",
                isAdmin && "border-theme-primary/40 bg-theme-primary/10",
              )}
            >
              <span>
                <span className="text-theme-text block text-sm font-bold">Zarządca</span>
                <span className="text-theme-muted block text-[11px]">
                  Może zmieniać cały wyjazd
                </span>
              </span>
              {isAdmin && <Check className="text-theme-primary" size={17} />}
            </button>
            {teams.length > 0 && (
              <label className="flex flex-col gap-1.5">
                <span className="text-theme-muted text-xs">Drużyna</span>
                <Select
                  value={teamId ?? "none"}
                  onValueChange={(value) => setTeamId(value === "none" ? null : value)}
                >
                  <SelectTrigger className="bg-theme-card border-theme-border h-12 w-full rounded-[var(--theme-radius-control)] px-3">
                    <SelectValue placeholder="Bez drużyny" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Bez drużyny</SelectItem>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
            )}
            <Button type="button" onClick={() => void save()} disabled={isSaving || !name.trim()}>
              {isSaving ? "Zapisywanie…" : editor?.userId ? "Zapisz zmiany" : "Dodaj uczestnika"}
            </Button>
          </div>
        </ResponsiveDialog>
      </SettingsCard>
    </div>
  );
}

function formatLastSeen(value: string | null, nowTimestamp: number) {
  if (!value) return "Jeszcze niewidziany w aplikacji";

  const seenAt = new Date(value);
  const now = new Date(nowTimestamp);
  const difference = Math.max(0, now.getTime() - seenAt.getTime());
  if (difference < 2 * 60_000) return "Widziany niedawno";

  const minutes = Math.floor(difference / 60_000);
  if (minutes < 60) return `Widziany ${relativeMinutes(minutes)} temu`;

  const hours = Math.floor(difference / 3_600_000);
  if (hours < 24) return `Widziany ${relativeHours(hours)} temu`;

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const seenDay = new Date(seenAt.getFullYear(), seenAt.getMonth(), seenAt.getDate()).getTime();
  const days = Math.round((today - seenDay) / 86_400_000);

  if (days === 1) {
    return `Widziany wczoraj o ${seenAt.toLocaleTimeString("pl-PL", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }
  if (days > 1 && days < 7) return `Widziany ${days} dni temu`;
  return `Widziany ${seenAt.toLocaleString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function relativeMinutes(value: number) {
  if (value === 1) return "minutę";
  const lastTwo = value % 100;
  const last = value % 10;
  return last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14)
    ? `${value} minuty`
    : `${value} minut`;
}

function relativeHours(value: number) {
  if (value === 1) return "godzinę";
  const lastTwo = value % 100;
  const last = value % 10;
  return last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14)
    ? `${value} godziny`
    : `${value} godzin`;
}
