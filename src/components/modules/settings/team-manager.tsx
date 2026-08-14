"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Pencil, Plus, Trash2 } from "lucide-react";
import {
  addTeamAction,
  deleteTeamAction,
  updateParticipantAction,
  updateTeamAction,
} from "~/app/actions/trips";
import { Avatar } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { ResponsiveDialog } from "~/components/ui/responsive-dialog";
import type { ManagedParticipant, ManagedTeam } from "~/components/modules/settings/settings-types";
import { runClientAction } from "~/lib/client-action";
import { cn } from "~/lib/utils";

const TEAM_COLORS = ["#ffb44a", "#49a078", "#3b82f6", "#8b5cf6", "#ef6f6c", "#14b8a6"];

export function TeamManager({
  tripKey,
  teams,
  participants,
}: {
  tripKey: string;
  teams: ManagedTeam[];
  participants: ManagedParticipant[];
}) {
  const router = useRouter();
  const [editor, setEditor] = useState<{ teamId: string | null } | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState(TEAM_COLORS[0]!);
  const [isSaving, setIsSaving] = useState(false);
  const [processingUserId, setProcessingUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const editedTeam = teams.find((team) => team.id === editor?.teamId) ?? null;

  const openEditor = (team?: ManagedTeam) => {
    setError(null);
    setName(team?.name ?? "");
    setColor(team?.color ?? TEAM_COLORS[0]!);
    setEditor({ teamId: team?.id ?? null });
  };

  const save = async () => {
    if (!name.trim() || isSaving) return;
    setIsSaving(true);
    setError(null);
    const result = await runClientAction(
      () =>
        editor?.teamId
          ? updateTeamAction({
              tripKey,
              teamId: editor.teamId,
              name,
              color,
            })
          : addTeamAction({ tripKey, name, color }),
      "Nie udało się zapisać drużyny.",
    );
    setIsSaving(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setEditor(null);
    router.refresh();
  };

  const removeTeam = async (team: ManagedTeam) => {
    if (!window.confirm(`Usunąć drużynę ${team.name}? Uczestnicy zostaną bez drużyny.`)) return;
    setIsSaving(true);
    setError(null);
    const result = await runClientAction(
      () => deleteTeamAction({ tripKey, teamId: team.id }),
      "Nie udało się usunąć drużyny.",
    );
    setIsSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  };

  const toggleMember = async (participant: ManagedParticipant) => {
    if (!editedTeam || processingUserId) return;
    setProcessingUserId(participant.id);
    setError(null);
    const result = await runClientAction(
      () =>
        updateParticipantAction({
          tripKey,
          userId: participant.id,
          name: participant.name,
          isAdmin: participant.isAdmin,
          teamId: participant.teamId === editedTeam.id ? null : editedTeam.id,
        }),
      "Nie udało się zmienić składu drużyny.",
    );
    setProcessingUserId(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-theme-text text-sm font-bold">Drużyny · {teams.length}</h2>
          <p className="text-theme-muted mt-0.5 text-xs">Nazwy, kolory i skład punktacji.</p>
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

      {teams.length === 0 ? (
        <button
          type="button"
          onClick={() => openEditor()}
          className="border-theme-border text-theme-muted min-h-20 rounded-xl border border-dashed px-4 text-center text-xs"
        >
          Dodaj pierwszą drużynę
        </button>
      ) : (
        <div className="border-theme-border divide-theme-border divide-y overflow-hidden rounded-xl border px-3">
          {teams.map((team) => {
            const members = participants.filter((participant) => participant.teamId === team.id);
            return (
              <div key={team.id} className="flex min-h-17 items-center gap-3 py-2.5">
                <span
                  className="size-3 shrink-0 rounded-full"
                  style={{ backgroundColor: team.color }}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-theme-text truncate text-sm font-bold">{team.name}</p>
                  <p className="text-theme-muted mt-0.5 truncate text-[10px]">
                    {members.length === 0
                      ? "Bez uczestników"
                      : members.map((member) => member.name).join(", ")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openEditor(team)}
                  className="text-theme-muted hover:text-theme-text flex size-10 items-center justify-center"
                  aria-label={`Edytuj drużynę ${team.name}`}
                >
                  <Pencil size={16} />
                </button>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => void removeTeam(team)}
                  className="text-theme-muted hover:text-theme-danger flex size-10 items-center justify-center disabled:opacity-40"
                  aria-label={`Usuń drużynę ${team.name}`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <ResponsiveDialog
        isOpen={editor !== null}
        setIsOpen={(open) => !open && setEditor(null)}
        title={editor?.teamId ? "Edytuj drużynę" : "Nowa drużyna"}
        description={
          editor?.teamId
            ? "Zmień wygląd drużyny i zaznacz osoby, które mają do niej należeć."
            : "Najpierw nadaj drużynie nazwę i kolor."
        }
      >
        <div className="flex flex-col gap-4">
          {error && (
            <p className="border-theme-danger/30 bg-theme-danger/10 text-theme-danger rounded-xl border px-3 py-2 text-xs font-bold">
              {error}
            </p>
          )}
          <Input
            label="Nazwa drużyny"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />

          <div>
            <p className="text-theme-muted mb-2 text-xs">Kolor</p>
            <div className="flex flex-wrap gap-2">
              {TEAM_COLORS.map((teamColor) => (
                <button
                  key={teamColor}
                  type="button"
                  onClick={() => setColor(teamColor)}
                  className={cn(
                    "flex size-11 items-center justify-center rounded-full border-2",
                    color === teamColor ? "border-theme-text" : "border-transparent",
                  )}
                  aria-label={`Wybierz kolor ${teamColor}`}
                >
                  <span className="size-8 rounded-full" style={{ backgroundColor: teamColor }} />
                </button>
              ))}
              <label className="border-theme-border flex size-11 items-center justify-center overflow-hidden rounded-full border">
                <span className="sr-only">Własny kolor</span>
                <input
                  type="color"
                  value={color}
                  onChange={(event) => setColor(event.target.value)}
                  className="size-14 cursor-pointer border-0 bg-transparent p-0"
                />
              </label>
            </div>
          </div>

          {editedTeam && (
            <div>
              <p className="text-theme-muted mb-2 text-xs">Skład drużyny</p>
              <div className="border-theme-border divide-theme-border divide-y overflow-hidden rounded-xl border">
                {participants.map((participant) => {
                  const selected = participant.teamId === editedTeam.id;
                  const currentTeam = teams.find((team) => team.id === participant.teamId);
                  return (
                    <button
                      key={participant.id}
                      type="button"
                      disabled={processingUserId !== null}
                      onClick={() => void toggleMember(participant)}
                      className="flex min-h-13 w-full items-center gap-3 px-3 text-left disabled:opacity-50"
                    >
                      <Avatar
                        user={{ id: participant.id, name: participant.name, avatarUrl: null }}
                        className="size-8 text-xs"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="text-theme-text block truncate text-sm font-bold">
                          {participant.name}
                        </span>
                        {!selected && currentTeam && (
                          <span className="text-theme-muted block truncate text-[10px]">
                            Obecnie: {currentTeam.name}
                          </span>
                        )}
                      </span>
                      <span
                        className={cn(
                          "border-theme-border flex size-6 items-center justify-center rounded-full border",
                          selected &&
                            "border-theme-primary bg-theme-primary text-theme-primary-foreground",
                        )}
                      >
                        {selected && <Check size={14} strokeWidth={3} />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <Button type="button" onClick={() => void save()} disabled={isSaving || !name.trim()}>
            {isSaving ? "Zapisywanie…" : editor?.teamId ? "Zapisz drużynę" : "Dodaj drużynę"}
          </Button>
        </div>
      </ResponsiveDialog>
    </div>
  );
}
