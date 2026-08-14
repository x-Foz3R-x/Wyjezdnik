"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Backpack, Check, ChevronRight, EyeOff, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import { ResponsiveDialog } from "~/components/ui/responsive-dialog";
import { Button } from "~/components/ui/button";
import {
  addPackingPersonalItemAction,
  deletePackingPersonalItemAction,
  setPackingPresetItemStateAction,
  togglePackingPersonalItemAction,
} from "~/app/actions/packing";
import type { PackingPresetItem } from "~/lib/packing";
import type { Database } from "~/types/database";
import { useTripRoute } from "~/providers/trip-route-provider";
import { cn } from "~/lib/utils";
import { runClientAction } from "~/lib/client-action";

type PackingState = {
  item_key: string;
  is_checked: boolean;
  is_hidden: boolean;
};

type PersonalItem = Database["public"]["Tables"]["packing_personal_items"]["Row"];
type SelectedItem =
  { kind: "preset"; item: PackingPresetItem } | { kind: "personal"; item: PersonalItem };

export function PackingWidget({
  presetItems,
  states,
  personalItems: initialPersonalItems,
  isReadOnly,
}: {
  presetItems: PackingPresetItem[];
  states: PackingState[];
  personalItems: PersonalItem[];
  isReadOnly: boolean;
}) {
  const { urlKey, userId } = useTripRoute();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(searchParams.get("packing") === "open");
  const [stateByKey, setStateByKey] = useState<Record<string, PackingState>>(() =>
    Object.fromEntries(states.map((state) => [state.item_key, state])),
  );
  const [personalItems, setPersonalItems] = useState(initialPersonalItems);
  const [newItem, setNewItem] = useState("");
  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingItemKeys, setPendingItemKeys] = useState<Set<string>>(() => new Set());
  const [error, setError] = useState<string | null>(null);

  const visiblePresetItems = presetItems.filter((item) => !stateByKey[item.key]?.is_hidden);
  const categories = useMemo(() => {
    const result = new Map<string, PackingPresetItem[]>();
    for (const item of visiblePresetItems) {
      result.set(item.category, [...(result.get(item.category) ?? []), item]);
    }
    return [...result];
  }, [visiblePresetItems]);

  const totalItems = visiblePresetItems.length + personalItems.length;
  const checkedCount =
    visiblePresetItems.filter((item) => stateByKey[item.key]?.is_checked).length +
    personalItems.filter((item) => item.is_checked).length;
  const progressPercent = totalItems === 0 ? 0 : Math.round((checkedCount / totalItems) * 100);

  const togglePreset = async (item: PackingPresetItem) => {
    const pendingKey = `preset:${item.key}`;
    if (isReadOnly || isSaving || pendingItemKeys.has(pendingKey)) return;
    const previous = stateByKey[item.key] ?? {
      item_key: item.key,
      is_checked: false,
      is_hidden: false,
    };
    const next = { ...previous, is_checked: !previous.is_checked };
    setStateByKey((current) => ({ ...current, [item.key]: next }));
    setPendingItemKeys((current) => new Set(current).add(pendingKey));
    setError(null);

    const result = await runClientAction(
      () =>
        setPackingPresetItemStateAction({
          tripKey: urlKey,
          itemKey: item.key,
          isChecked: next.is_checked,
          isHidden: next.is_hidden,
        }),
      "Nie udało się zapisać pakowania.",
    );
    setPendingItemKeys((current) => {
      const nextPending = new Set(current);
      nextPending.delete(pendingKey);
      return nextPending;
    });
    if (!result.ok) {
      setStateByKey((current) => ({ ...current, [item.key]: previous }));
      setError(result.error);
    }
  };

  const togglePersonal = async (item: PersonalItem) => {
    const pendingKey = `personal:${item.id}`;
    if (isReadOnly || isSaving || pendingItemKeys.has(pendingKey)) return;
    const nextChecked = !item.is_checked;
    setPersonalItems((current) =>
      current.map((candidate) =>
        candidate.id === item.id ? { ...candidate, is_checked: nextChecked } : candidate,
      ),
    );
    setPendingItemKeys((current) => new Set(current).add(pendingKey));
    setError(null);

    const result = await runClientAction(
      () =>
        togglePackingPersonalItemAction({
          tripKey: urlKey,
          itemId: item.id,
          isChecked: nextChecked,
        }),
      "Nie udało się zapisać pakowania.",
    );
    setPendingItemKeys((current) => {
      const nextPending = new Set(current);
      nextPending.delete(pendingKey);
      return nextPending;
    });
    if (!result.ok) {
      setPersonalItems((current) =>
        current.map((candidate) => (candidate.id === item.id ? item : candidate)),
      );
      setError(result.error);
    }
  };

  const addPersonalItem = async () => {
    const label = newItem.trim();
    if (!label || isReadOnly || isSaving) return;
    setIsSaving(true);
    setError(null);
    const temporaryId = crypto.randomUUID();
    const now = new Date().toISOString();
    const temporaryItem: PersonalItem = {
      id: temporaryId,
      trip_id: "",
      user_id: userId ?? "",
      label,
      category: "Moje rzeczy",
      is_checked: false,
      sort_order: personalItems.length,
      created_at: now,
      updated_at: now,
    };
    setNewItem("");
    setPersonalItems((current) => [...current, temporaryItem]);
    const result = await runClientAction(
      () => addPackingPersonalItemAction({ tripKey: urlKey, label }),
      "Nie udało się dopisać rzeczy.",
    );
    setIsSaving(false);

    if (!result.ok) {
      setPersonalItems((current) => current.filter((item) => item.id !== temporaryId));
      setNewItem(label);
      setError(result.error);
      return;
    }

    setPersonalItems((current) =>
      current.map((item) => (item.id === temporaryId ? result.item : item)),
    );
  };

  const removeSelectedItem = async () => {
    if (!selectedItem || isReadOnly || isSaving) return;
    setIsSaving(true);
    setError(null);

    if (selectedItem.kind === "preset") {
      const item = selectedItem.item;
      const current = stateByKey[item.key] ?? {
        item_key: item.key,
        is_checked: false,
        is_hidden: false,
      };
      setSelectedItem(null);
      setStateByKey((previous) => ({
        ...previous,
        [item.key]: { ...current, is_hidden: true },
      }));
      const result = await runClientAction(
        () =>
          setPackingPresetItemStateAction({
            tripKey: urlKey,
            itemKey: item.key,
            isChecked: current.is_checked,
            isHidden: true,
          }),
        "Nie udało się usunąć rzeczy.",
      );
      setIsSaving(false);
      if (!result.ok) {
        setStateByKey((previous) => ({ ...previous, [item.key]: current }));
        setSelectedItem(selectedItem);
        setError(result.error);
        return;
      }
    } else {
      const item = selectedItem.item;
      setSelectedItem(null);
      setPersonalItems((current) => current.filter((candidate) => candidate.id !== item.id));
      const result = await runClientAction(
        () =>
          deletePackingPersonalItemAction({
            tripKey: urlKey,
            itemId: item.id,
          }),
        "Nie udało się usunąć rzeczy.",
      );
      setIsSaving(false);
      if (!result.ok) {
        setPersonalItems((current) => [...current, item]);
        setSelectedItem(selectedItem);
        setError(result.error);
        return;
      }
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="bg-theme-card border-theme-border flex min-h-28 w-full flex-col justify-between gap-4 rounded-2xl border p-4 text-left transition active:scale-99"
      >
        <div className="flex w-full items-center justify-between">
          <div className="text-theme-primary flex items-center gap-2">
            <Backpack size={18} />
            <span className="text-[10px] font-bold tracking-[0.14em] uppercase">Pakowanie</span>
          </div>
          <ChevronRight size={18} className="text-theme-muted" />
        </div>

        <div className="flex w-full items-center justify-between gap-4">
          <div className="bg-theme-bg/70 h-2 flex-1 overflow-hidden rounded-full">
            <div
              className="from-theme-primary to-theme-accent h-full rounded-full bg-linear-to-r transition-[width] duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-theme-text min-w-10 text-right font-mono text-sm font-bold">
            {progressPercent}%
          </span>
        </div>
        <p className="text-theme-muted text-xs">
          {totalItems === 0
            ? "Zarządca nie wybrał jeszcze zestawów"
            : `${checkedCount} z ${totalItems} rzeczy gotowe`}
        </p>
      </button>

      <ResponsiveDialog
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        title="Twoje pakowanie"
        description="Ta lista i jej postęp są prywatne."
      >
        <div className="pb-safe flex max-h-[70dvh] flex-col gap-5 overflow-y-auto px-1">
          {!isReadOnly && (
            <form
              className="border-theme-border flex min-h-12 items-center rounded-2xl border pl-4"
              onSubmit={(event) => {
                event.preventDefault();
                void addPersonalItem();
              }}
            >
              <input
                value={newItem}
                onChange={(event) => setNewItem(event.target.value)}
                placeholder="Dopisz własną rzecz…"
                className="text-theme-text placeholder:text-theme-muted min-w-0 flex-1 bg-transparent text-sm outline-hidden"
              />
              <button
                type="submit"
                disabled={!newItem.trim() || isSaving}
                className="text-theme-primary flex size-12 items-center justify-center disabled:opacity-30"
                aria-label="Dodaj do pakowania"
              >
                <Plus size={20} />
              </button>
            </form>
          )}

          {error && (
            <p className="border-theme-danger/30 bg-theme-danger/8 text-theme-danger rounded-xl border px-3 py-2 text-xs">
              {error}
            </p>
          )}

          {categories.map(([category, items]) => (
            <PackingSection key={category} title={category}>
              {items.map((item) => (
                <PackingRow
                  key={item.key}
                  label={item.label}
                  checked={Boolean(stateByKey[item.key]?.is_checked)}
                  disabled={isReadOnly || pendingItemKeys.has(`preset:${item.key}`)}
                  onToggle={() => void togglePreset(item)}
                  onMore={isReadOnly ? undefined : () => setSelectedItem({ kind: "preset", item })}
                />
              ))}
            </PackingSection>
          ))}

          {personalItems.length > 0 && (
            <PackingSection title="Moje rzeczy">
              {personalItems.map((item) => (
                <PackingRow
                  key={item.id}
                  label={item.label}
                  checked={item.is_checked}
                  disabled={isReadOnly || pendingItemKeys.has(`personal:${item.id}`)}
                  onToggle={() => void togglePersonal(item)}
                  onMore={
                    isReadOnly ? undefined : () => setSelectedItem({ kind: "personal", item })
                  }
                />
              ))}
            </PackingSection>
          )}

          {totalItems === 0 && (
            <p className="text-theme-muted py-8 text-center text-sm">
              Lista jest pusta. Zarządca może wybrać gotowe zestawy w ustawieniach wyjazdu.
            </p>
          )}
        </div>
      </ResponsiveDialog>

      <ResponsiveDialog
        isOpen={selectedItem !== null}
        setIsOpen={(open) => !open && setSelectedItem(null)}
        title={selectedItem?.kind === "preset" ? "Rzecz z zestawu" : "Własna rzecz"}
        description={selectedItem?.item.label}
      >
        <p className="text-theme-muted mb-4 text-sm">
          {selectedItem?.kind === "preset"
            ? "Ukrycie dotyczy tylko Twojej listy. Zestaw Zarządcy pozostanie bez zmian."
            : "Usunięcie dotyczy tylko Twojej prywatnej listy."}
        </p>
        <Button
          type="button"
          variant="outline"
          disabled={isSaving}
          className="border-theme-danger/35 text-theme-danger w-full gap-2"
          onClick={() => void removeSelectedItem()}
        >
          {selectedItem?.kind === "preset" ? <EyeOff size={17} /> : <Trash2 size={17} />}
          {isSaving
            ? "Zapisywanie…"
            : selectedItem?.kind === "preset"
              ? "Ukryj z mojej listy"
              : "Usuń z mojej listy"}
        </Button>
      </ResponsiveDialog>
    </>
  );
}

function PackingSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-theme-muted mb-1 text-[10px] font-bold tracking-[0.15em] uppercase">
        {title}
      </h3>
      <div className="border-theme-border divide-theme-border divide-y overflow-hidden rounded-2xl border">
        {children}
      </div>
    </section>
  );
}

function PackingRow({
  label,
  checked,
  disabled,
  onToggle,
  onMore,
}: {
  label: string;
  checked: boolean;
  disabled: boolean;
  onToggle: () => void;
  onMore?: () => void;
}) {
  return (
    <div className="flex min-h-13 items-center pl-2">
      <button
        type="button"
        disabled={disabled}
        onClick={onToggle}
        className="flex min-h-13 min-w-0 flex-1 items-center gap-3 px-2 text-left disabled:cursor-default"
      >
        <span
          className={cn(
            "border-theme-border flex size-6 shrink-0 items-center justify-center rounded-full border transition",
            checked && "border-theme-primary bg-theme-primary text-theme-primary-foreground",
          )}
        >
          {checked && <Check size={14} strokeWidth={3} />}
        </span>
        <span
          className={cn(
            "text-theme-text min-w-0 flex-1 text-sm",
            checked && "text-theme-muted line-through",
          )}
        >
          {label}
        </span>
      </button>
      {onMore && (
        <button
          type="button"
          onClick={onMore}
          className="text-theme-muted flex size-12 shrink-0 items-center justify-center"
          aria-label={`Opcje: ${label}`}
        >
          <MoreHorizontal size={18} />
        </button>
      )}
    </div>
  );
}
