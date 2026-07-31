"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Smartphone } from "lucide-react";
import { updateParticipantProfileAction } from "~/app/actions/trips";
import { ResponsiveDialog } from "~/components/responsive-dialog";
import { Button } from "~/components/ui/button";
import { runClientAction } from "~/lib/client-action";
import {
  getLocalProfileOfferKey,
  readLocalProfile,
  type LocalProfile,
  type LocalProfileData,
} from "~/lib/local-profile";

type ProfileField = keyof LocalProfileData;

const PROFILE_FIELDS: Array<{ key: ProfileField; label: string }> = [
  { key: "name", label: "Nazwa" },
  { key: "avatarUrl", label: "Avatar" },
  { key: "phone", label: "Telefon / BLIK" },
  { key: "revolutUrl", label: "Revolut" },
  { key: "paymentNote", label: "Inny sposób zwrotu" },
];

export function LocalProfileOffer({
  tripKey,
  userId,
  currentProfile,
}: {
  tripKey: string;
  userId: string;
  currentProfile: LocalProfileData;
}) {
  const router = useRouter();
  const [localProfile, setLocalProfile] = useState<LocalProfile | null>(null);
  const [selectedFields, setSelectedFields] = useState<ProfileField[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = readLocalProfile();
    if (!stored) return;

    const availableFields = PROFILE_FIELDS.filter(
      ({ key }) => stored[key] && stored[key] !== currentProfile[key],
    ).map(({ key }) => key);
    if (availableFields.length === 0) return;

    const offerKey = getLocalProfileOfferKey(tripKey, userId, stored);
    try {
      if (window.localStorage.getItem(offerKey) === "dismissed") return;
    } catch {
      // Brak pamięci nie powinien blokować jednorazowego pytania.
    }

    setLocalProfile(stored);
    setSelectedFields(availableFields);
    setIsOpen(true);
  }, [currentProfile, tripKey, userId]);

  const offeredFields = useMemo(
    () =>
      localProfile
        ? PROFILE_FIELDS.filter(
            ({ key }) => localProfile[key] && localProfile[key] !== currentProfile[key],
          )
        : [],
    [currentProfile, localProfile],
  );

  const dismiss = () => {
    if (localProfile) {
      try {
        window.localStorage.setItem(
          getLocalProfileOfferKey(tripKey, userId, localProfile),
          "dismissed",
        );
      } catch {
        // Zamknięcie okna nadal działa bez localStorage.
      }
    }
    setIsOpen(false);
  };

  const applyProfile = async () => {
    if (!localProfile || selectedFields.length === 0) return;
    const next = { ...currentProfile };
    selectedFields.forEach((field) => {
      next[field] = localProfile[field];
    });

    setIsSaving(true);
    setError(null);
    const result = await runClientAction(
      () =>
        updateParticipantProfileAction({
          tripKey,
          name: next.name,
          avatarUrl: nullable(next.avatarUrl),
          phone: nullable(next.phone),
          revolutUrl: nullable(next.revolutUrl),
          paymentNote: nullable(next.paymentNote),
          newPin: null,
        }),
      "Nie udało się skopiować danych profilu.",
    );
    setIsSaving(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    dismiss();
    router.refresh();
  };

  return (
    <ResponsiveDialog
      isOpen={isOpen}
      setIsOpen={(open) => {
        if (!open) dismiss();
      }}
      title="Użyć profilu z tego urządzenia?"
      description="Wybierz dane, które chcesz udostępnić w tym wyjeździe. Nic nie zostanie skopiowane bez potwierdzenia."
    >
      {localProfile && (
        <div className="space-y-4">
          <div className="border-theme-border bg-theme-primary/5 flex items-center gap-3 rounded-2xl border p-3">
            <span className="bg-theme-primary/10 text-theme-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
              <Smartphone size={18} />
            </span>
            <div className="min-w-0">
              <p className="text-theme-text text-sm font-bold">{localProfile.name}</p>
              <p className="text-theme-muted text-xs">Profil zapisany tylko w tej przeglądarce</p>
            </div>
          </div>

          <div className="border-theme-border divide-theme-border divide-y overflow-hidden rounded-2xl border">
            {offeredFields.map(({ key, label }) => (
              <label
                key={key}
                className="flex min-h-14 cursor-pointer items-center gap-3 px-4 py-2"
              >
                <input
                  type="checkbox"
                  checked={selectedFields.includes(key)}
                  onChange={(event) =>
                    setSelectedFields((current) =>
                      event.target.checked
                        ? [...current, key]
                        : current.filter((field) => field !== key),
                    )
                  }
                  className="accent-theme-primary size-4 shrink-0"
                />
                <span className="min-w-0 flex-1">
                  <span className="text-theme-text block text-xs font-bold">{label}</span>
                  <span className="text-theme-muted block truncate text-[11px]">
                    {localProfile[key]}
                  </span>
                </span>
              </label>
            ))}
          </div>

          {error && <p className="text-theme-danger text-xs font-bold">{error}</p>}

          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" onClick={dismiss}>
              Nie teraz
            </Button>
            <Button
              type="button"
              disabled={selectedFields.length === 0 || isSaving}
              onClick={() => void applyProfile()}
            >
              {isSaving ? "Kopiowanie…" : "Użyj wybranych"}
            </Button>
          </div>
          <p className="text-theme-muted text-[11px]">
            PIN nie jest częścią profilu urządzenia i nigdy nie jest tutaj kopiowany.
          </p>
        </div>
      )}
    </ResponsiveDialog>
  );
}

function nullable(value: string) {
  return value.trim() || null;
}
