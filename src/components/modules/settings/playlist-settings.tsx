"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Music2, Plus, Trash2 } from "lucide-react";
import { deletePlaylistAction, savePlaylistAction } from "~/app/actions/playlists";
import { ResponsiveDialog } from "~/components/ui/responsive-dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { runClientAction } from "~/lib/client-action";

export function PlaylistSettings({
  tripKey,
  playlists,
}: {
  tripKey: string;
  playlists: Array<{ id: string; name: string; url: string }>;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const add = async () => {
    setIsSaving(true);
    setError(null);
    const result = await runClientAction(
      () => savePlaylistAction({ id: null, tripKey, name, url }),
      "Nie udało się dodać playlisty.",
    );
    setIsSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setName("");
    setUrl("");
    setIsOpen(false);
    router.refresh();
  };

  const remove = async (id: string) => {
    if (id === "legacy") {
      setError("Uruchom najnowszą migrację Supabase, aby zarządzać tą playlistą.");
      return;
    }
    if (!window.confirm("Usunąć tę playlistę?")) return;
    setIsSaving(true);
    const result = await runClientAction(
      () => deletePlaylistAction({ id, tripKey }),
      "Nie udało się usunąć playlisty.",
    );
    setIsSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <div className="border-theme-danger/30 bg-theme-danger/10 text-theme-danger rounded-xl border px-3 py-2 text-xs font-bold">
          {error}
        </div>
      )}
      {playlists.length > 0 && (
        <div className="border-theme-border divide-theme-border flex flex-col divide-y rounded-xl border px-3">
          {playlists.map((playlist) => (
            <div key={playlist.id} className="flex min-h-14 items-center gap-3 py-2">
              <Music2 className="text-theme-accent shrink-0" size={18} />
              <div className="min-w-0 flex-1">
                <p className="text-theme-text truncate text-sm font-bold">{playlist.name}</p>
                <p className="text-theme-muted truncate text-[11px]">{playlist.url}</p>
              </div>
              <button
                type="button"
                onClick={() => void remove(playlist.id)}
                disabled={isSaving}
                className="text-theme-muted hover:text-theme-danger flex h-10 w-10 items-center justify-center"
                aria-label={`Usuń playlistę ${playlist.name}`}
              >
                <Trash2 size={17} />
              </button>
            </div>
          ))}
        </div>
      )}
      <Button type="button" variant="outline" onClick={() => setIsOpen(true)}>
        <Plus size={17} />
        Dodaj playlistę
      </Button>

      <ResponsiveDialog
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        title="Nowa playlista"
        description="Możesz dodać Spotify, YouTube Music albo dowolny inny link."
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Nazwa"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="np. Droga nad jezioro"
          />
          <Input
            type="url"
            label="Link"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://..."
          />
          <Button type="button" onClick={add} disabled={isSaving}>
            {isSaving ? "Dodawanie…" : "Dodaj playlistę"}
          </Button>
        </div>
      </ResponsiveDialog>
    </div>
  );
}
