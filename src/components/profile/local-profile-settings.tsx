"use client";

import { useEffect, useState } from "react";
import { Download, Smartphone, Trash2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import {
  readLocalProfile,
  removeLocalProfile,
  writeLocalProfile,
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

export function LocalProfileSettings({
  currentProfile,
  onApply,
}: {
  currentProfile: LocalProfileData;
  onApply: (profile: LocalProfileData) => void;
}) {
  const [storedProfile, setStoredProfile] = useState<LocalProfile | null>(null);
  const [selectedFields, setSelectedFields] = useState<ProfileField[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const stored = readLocalProfile();
    setStoredProfile(stored);
    if (stored) {
      setSelectedFields(
        PROFILE_FIELDS.filter(({ key }) => Boolean(stored[key])).map(({ key }) => key),
      );
    }
  }, []);

  const saveOnDevice = () => {
    const saved = writeLocalProfile(currentProfile);
    if (!saved) {
      setMessage("Nie udało się zapisać profilu w tej przeglądarce.");
      return;
    }
    setStoredProfile(saved);
    setSelectedFields(
      PROFILE_FIELDS.filter(({ key }) => Boolean(saved[key])).map(({ key }) => key),
    );
    setMessage("Profil zapisany na tym urządzeniu. PIN nie został zapisany.");
  };

  const applyFromDevice = () => {
    if (!storedProfile || selectedFields.length === 0) return;
    const next = { ...currentProfile };
    selectedFields.forEach((field) => {
      next[field] = storedProfile[field];
    });
    onApply(next);
    setMessage("Dane zostały wstawione do formularza. Zapisz profil, aby wysłać je do wyjazdu.");
  };

  const removeFromDevice = () => {
    removeLocalProfile();
    setStoredProfile(null);
    setSelectedFields([]);
    setMessage("Lokalny profil został usunięty z tej przeglądarki.");
  };

  return (
    <section className="border-theme-border bg-theme-card overflow-hidden rounded-2xl border">
      <div className="flex items-start gap-3 p-4">
        <span className="bg-theme-primary/10 text-theme-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
          <Smartphone size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-theme-text text-sm font-bold">Profil na tym urządzeniu</h2>
          <p className="text-theme-muted mt-1 text-xs leading-relaxed">
            Przechowuje nazwę, avatar i dane płatności w tej przeglądarce, żeby użyć ich w innych
            wyjazdach.
          </p>
        </div>
      </div>

      {storedProfile && (
        <div className="border-theme-border border-t px-4 py-3">
          <p className="text-theme-muted mb-1 text-[10px] font-bold tracking-wider uppercase">
            Co wstawić do tego wyjazdu
          </p>
          {PROFILE_FIELDS.filter(({ key }) => Boolean(storedProfile[key])).map(({ key, label }) => (
            <Checkbox
              key={key}
              checked={selectedFields.includes(key)}
              onChange={(checked) =>
                setSelectedFields((current) =>
                  checked ? [...current, key] : current.filter((field) => field !== key),
                )
              }
              label={label}
              description={storedProfile[key]}
              className="min-h-11"
            />
          ))}
          <Button
            type="button"
            variant="outline"
            className="mt-2 w-full"
            disabled={selectedFields.length === 0}
            onClick={applyFromDevice}
          >
            <Download size={16} /> Wstaw zaznaczone dane
          </Button>
        </div>
      )}

      {message && (
        <p className="text-theme-muted border-theme-border border-t px-4 py-3 text-xs">{message}</p>
      )}

      <div className="border-theme-border grid grid-cols-2 gap-2 border-t p-3">
        <Button type="button" variant="outline" onClick={saveOnDevice}>
          Zapisz obecne
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={!storedProfile}
          className="text-theme-danger"
          onClick={removeFromDevice}
        >
          <Trash2 size={15} /> Usuń lokalny
        </Button>
      </div>
      <p className="text-theme-muted px-4 pb-4 text-[11px]">
        PIN nie trafia do profilu urządzenia. Dane nie są automatycznie przekazywane do wyjazdów.
      </p>
    </section>
  );
}
