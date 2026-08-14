"use client";

import type { Dispatch, SetStateAction } from "react";
import { ArrowUp, CircleDollarSign, Eye, Settings2 } from "lucide-react";
import { FinanceModeOption } from "~/components/modules/settings/finance-mode-option";
import {
  FeedbackBanner,
  SaveButton,
  SettingsCard,
  SettingsDisclosure,
  SettingsHeader,
  SettingsPage,
} from "~/components/modules/settings/settings-layout";
import type {
  Feedback,
  ManagedParticipant,
  TripSettingsInitialTrip,
  TripSettingsState,
} from "~/components/modules/settings/settings-types";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { CURRENCIES, type CurrencyCode } from "~/lib/currencies";
import { getSettlementStrategyLabel } from "~/lib/finances";

export function FinanceSettingsView({
  form,
  setForm,
  initialTrip,
  participants,
  feedback,
  isSaving,
  closeView,
  saveTrip,
}: {
  form: TripSettingsState;
  setForm: Dispatch<SetStateAction<TripSettingsState>>;
  initialTrip: TripSettingsInitialTrip;
  participants: ManagedParticipant[];
  feedback: Feedback;
  isSaving: boolean;
  closeView: () => void;
  saveTrip: () => Promise<void>;
}) {
  const expenseVisibilityLabel =
    form.expenseVisibility === "everyone"
      ? "wszyscy widzą cały wyjazd"
      : form.expenseVisibility === "selected"
        ? "wybrane osoby widzą cały wyjazd"
        : "pełny podgląd tylko dla zarządców";

  return (
    <SettingsPage>
      <SettingsHeader title="Rozliczenia" onBack={closeView} />
      <FeedbackBanner feedback={feedback} />

      {form.financeMode === "legacy" && (
        <div className="border-theme-primary/30 bg-theme-primary/8 rounded-2xl border p-4">
          <p className="text-theme-text text-sm font-bold">Dotychczasowy sposób liczenia</p>
          <p className="text-theme-muted mt-1 text-xs leading-relaxed">
            {initialTrip.financeEntryCount > 0
              ? "Ten wyjazd zachowuje stare rozliczenia, aby historia rachunków pozostała bez zmian."
              : "Rozliczenia są jeszcze puste, więc możesz bezpiecznie wybrać nowy sposób liczenia."}
          </p>
        </div>
      )}

      <SettingsCard title="Domyślna waluta" icon={CircleDollarSign}>
        <label className="flex flex-col gap-1.5">
          <span className="text-theme-muted text-xs">Podpowiadana przy nowych wydatkach</span>
          <Select
            value={form.defaultCurrency}
            onValueChange={(value) =>
              setForm({
                ...form,
                defaultCurrency: value as CurrencyCode,
              })
            }
          >
            <SelectTrigger className="bg-theme-card border-theme-border h-12 w-full rounded-[var(--theme-radius-control)] px-3">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((currency) => (
                <SelectItem key={currency.code} value={currency.code}>
                  {currency.code} · {currency.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <p className="text-theme-muted text-xs leading-relaxed">
          Zmiana nie przelicza starszych pozycji. Każda waluta ma osobny bilans, dzięki czemu euro i
          złotówki nigdy nie zostaną przypadkiem zsumowane.
        </p>
      </SettingsCard>

      <SettingsCard title="Sposób dzielenia rachunków" icon={CircleDollarSign}>
        <FinanceModeOption
          selected={form.financeMode === "whole"}
          disabled={initialTrip.financeEntryCount > 0}
          title="Pełne jednostki"
          badge="Polecane"
          description="Rachunek może mieć część dziesiętną, ale udziały pozostałych osób są normalnie zaokrąglane do pełnej jednostki. Reszta zostaje u płatnika."
          onSelect={() => setForm((current) => ({ ...current, financeMode: "whole" }))}
        />
        <FinanceModeOption
          selected={form.financeMode === "precise"}
          disabled={initialTrip.financeEntryCount > 0}
          title="Dokładnie do grosza"
          description="Cały rachunek jest rozliczany co do grosza. Dobre, gdy grupa chce pełnej precyzji."
          onSelect={() => setForm((current) => ({ ...current, financeMode: "precise" }))}
        />
      </SettingsCard>

      <SettingsDisclosure
        title="Więcej opcji rozliczeń"
        description={`${getSettlementStrategyLabel(form.settlementStrategy)} · ${expenseVisibilityLabel}`}
        icon={Settings2}
        defaultOpen={
          form.settlementStrategy !== "relational" || form.expenseVisibility !== "everyone"
        }
      >
        <SettingsCard title="Proponowane przelewy" icon={ArrowUp}>
          <FinanceModeOption
            selected={form.settlementStrategy === "relational"}
            title="Między właściwymi osobami"
            badge="Domyślnie"
            description="Każdy oddaje bezpośrednio tym osobom, które rzeczywiście płaciły za jego część."
            onSelect={() =>
              setForm((current) => ({ ...current, settlementStrategy: "relational" }))
            }
          />
          <FinanceModeOption
            selected={form.settlementStrategy === "optimized"}
            title="Mniej przelewów"
            description="Aplikacja zachowuje końcowe bilanse, ale skraca łańcuch długów i ogranicza liczbę przelewów."
            onSelect={() => setForm((current) => ({ ...current, settlementStrategy: "optimized" }))}
          />
        </SettingsCard>

        <SettingsCard title="Widoczność historii wydatków" icon={Eye}>
          <p className="text-theme-muted text-xs leading-relaxed">
            Każdy zawsze widzi rachunki, które go dotyczą. Tutaj ustalasz, kto może dodatkowo
            przeglądać wszystkie pozycje wyjazdu. Zarządcy mają pełny dostęp niezależnie od wyboru.
          </p>
          <FinanceModeOption
            selected={form.expenseVisibility === "everyone"}
            title="Wszyscy uczestnicy"
            description="Każda osoba może przełączyć historię między swoimi rachunkami a całym wyjazdem."
            onSelect={() => setForm((current) => ({ ...current, expenseVisibility: "everyone" }))}
          />
          <FinanceModeOption
            selected={form.expenseVisibility === "managers"}
            title="Tylko zarządcy"
            description="Pozostali uczestnicy zobaczą wyłącznie wydatki i przelewy, które ich dotyczą."
            onSelect={() => setForm((current) => ({ ...current, expenseVisibility: "managers" }))}
          />
          <FinanceModeOption
            selected={form.expenseVisibility === "selected"}
            title="Zarządcy i wybrane osoby"
            description="Nadaj pełny podgląd konkretnym uczestnikom bez robienia z nich zarządców."
            onSelect={() => setForm((current) => ({ ...current, expenseVisibility: "selected" }))}
          />

          {form.expenseVisibility === "selected" && (
            <div className="border-theme-border divide-theme-border divide-y overflow-hidden rounded-xl border">
              {participants
                .filter((participant) => !participant.isAdmin)
                .map((participant) => {
                  const selected = form.expenseViewerIds.includes(participant.id);
                  return (
                    <Checkbox
                      key={participant.id}
                      checked={selected}
                      label={participant.name}
                      className="min-h-12 px-3 py-2"
                      onChange={() =>
                        setForm((current) => ({
                          ...current,
                          expenseViewerIds: selected
                            ? current.expenseViewerIds.filter((id) => id !== participant.id)
                            : [...current.expenseViewerIds, participant.id],
                        }))
                      }
                    />
                  );
                })}
              {participants.every((participant) => participant.isAdmin) && (
                <p className="text-theme-muted px-3 py-4 text-xs">
                  Nie ma jeszcze uczestników bez roli Zarządcy.
                </p>
              )}
            </div>
          )}
        </SettingsCard>
      </SettingsDisclosure>

      {initialTrip.financeEntryCount > 0 && (
        <p className="text-theme-muted border-theme-border rounded-xl border px-4 py-3 text-xs leading-relaxed">
          Sposób zaokrąglania zostaje zablokowany po pierwszym wpisie, aby późniejsza zmiana nie
          naruszyła historii rachunków. Strategię przelewów możesz zmieniać w dowolnym momencie, bo
          nie modyfikuje zapisanych wydatków.
        </p>
      )}

      <SaveButton isSaving={isSaving} onClick={() => void saveTrip()} />
    </SettingsPage>
  );
}
