"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { Check, ChevronRight, Lock, Plus, ReceiptText, UsersRound } from "lucide-react";
import {
  createShoppingItemAction,
  getShoppingItemsAction,
  updateShoppingAudienceAction,
} from "~/app/actions/shopping";
import { ResponsiveDialog } from "~/components/ui/responsive-dialog";
import { ShoppingList } from "~/components/modules/shopping/shopping-list";
import { Avatar } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { Link } from "~/components/ui/link";
import { runClientAction } from "~/lib/client-action";
import { createBrowserSupabaseClient } from "~/lib/supabase/client";
import { useTripRoute } from "~/providers/trip-route-provider";
import type { Database } from "~/types/database";
import { cn } from "~/lib/utils";

type ShoppingItem = Database["public"]["Tables"]["shopping_list"]["Row"];
type User = Pick<Database["public"]["Tables"]["users"]["Row"], "id" | "name" | "avatar_url">;

export function ShoppingScreen({
  initialItems,
  initialUsers,
}: {
  initialItems: ShoppingItem[];
  initialUsers: User[];
}) {
  const { modules, tripId, urlKey, userId: activeUserId, isClosed } = useTripRoute();
  const [items, setItems] = useState(initialItems);
  const [itemName, setItemName] = useState("");
  const [forUsers, setForUsers] = useState<string[]>([]);
  const [audienceDraft, setAudienceDraft] = useState<string[]>([]);
  const [editingAudienceItem, setEditingAudienceItem] = useState<ShoppingItem | null>(null);
  const [activeOptionsItemId, setActiveOptionsItemId] = useState<string | null>(null);
  const [isAudienceOpen, setIsAudienceOpen] = useState(false);
  const [isSavingAudience, setIsSavingAudience] = useState(false);
  const [audienceError, setAudienceError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const presenceChannel = useRef<RealtimeChannel | null>(null);
  const pendingDeletionIds = useRef(new Set<string>());

  const upsertItem = useCallback((nextItem: ShoppingItem) => {
    pendingDeletionIds.current.delete(nextItem.id);
    setItems((current) => {
      const exists = current.some((item) => item.id === nextItem.id);
      const next = exists
        ? current.map((item) => (item.id === nextItem.id ? nextItem : item))
        : [...current, nextItem];
      return next.sort((first, second) => first.created_at.localeCompare(second.created_at));
    });
  }, []);

  const forgetItem = useCallback((itemId: string) => {
    setItems((current) => current.filter((item) => item.id !== itemId));
  }, []);

  const hidePendingDeletion = useCallback(
    (itemId: string) => {
      pendingDeletionIds.current.add(itemId);
      forgetItem(itemId);
    },
    [forgetItem],
  );

  const commitDeletion = useCallback((itemId: string) => {
    pendingDeletionIds.current.delete(itemId);
  }, []);

  const refreshItems = useCallback(async () => {
    const result = await runClientAction(
      () => getShoppingItemsAction({ tripKey: urlKey }),
      "Nie udało się odświeżyć listy zakupów.",
    );
    if (result.ok) {
      setItems(result.items.filter((item) => !pendingDeletionIds.current.has(item.id)));
    }
  }, [urlKey]);

  useEffect(() => {
    setItems(initialItems.filter((item) => !pendingDeletionIds.current.has(item.id)));
  }, [initialItems]);

  useEffect(() => {
    if (!activeUserId) return;

    const supabase = createBrowserSupabaseClient();
    const channel = supabase
      .channel(`shopping:${tripId}`, {
        config: {
          broadcast: { self: false, ack: false },
        },
      })
      .on("broadcast", { event: "invalidate" }, () => {
        void refreshItems();
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          void refreshItems();
        }
      });
    presenceChannel.current = channel;

    const interval = window.setInterval(() => void refreshItems(), 15_000);
    const refreshOnFocus = () => void refreshItems();
    window.addEventListener("focus", refreshOnFocus);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshOnFocus);
      presenceChannel.current = null;
      void supabase.removeChannel(channel);
    };
  }, [activeUserId, refreshItems, tripId]);

  const broadcastInvalidate = useCallback(() => {
    void presenceChannel.current?.send({
      type: "broadcast",
      event: "invalidate",
      payload: { at: Date.now() },
    });
  }, []);

  const openItems = items.filter((item) => !item.is_completed).length;
  const selectedUsers = useMemo(
    () => initialUsers.filter((user) => forUsers.includes(user.id)),
    [forUsers, initialUsers],
  );
  const audiencePresets = useMemo(() => {
    const presets = new Map<string, string[]>();
    items.forEach((item) => {
      const ids = [...new Set(item.for_users)].sort();
      if (ids.length === 0) return;
      presets.set(ids.join(":"), ids);
    });
    return [...presets.values()].slice(0, 4);
  }, [items]);

  const addItem = async () => {
    const trimmedName = itemName.trim();
    if (!trimmedName || isAdding || !activeUserId) return;

    const now = new Date().toISOString();
    const optimisticItem: ShoppingItem = {
      id: crypto.randomUUID(),
      trip_id: tripId,
      added_by: activeUserId,
      item_name: trimmedName,
      for_users: forUsers,
      is_completed: false,
      completed_by: null,
      completed_at: null,
      claimed_by: null,
      claimed_at: null,
      created_at: now,
      updated_at: now,
    };

    setIsAdding(true);
    setAddError(null);
    setItemName("");
    upsertItem(optimisticItem);
    const result = await runClientAction(
      () =>
        createShoppingItemAction({
          tripKey: urlKey,
          itemName: trimmedName,
          forUsers,
        }),
      "Nie udało się dodać produktu.",
    );
    setIsAdding(false);

    if (!result.ok) {
      forgetItem(optimisticItem.id);
      setItemName((current) => current || trimmedName);
      setAddError(result.error);
      return;
    }

    forgetItem(optimisticItem.id);
    upsertItem(result.item);
    broadcastInvalidate();
  };

  const openNewAudience = () => {
    setEditingAudienceItem(null);
    setAudienceDraft(forUsers);
    setAudienceError(null);
    setIsAudienceOpen(true);
  };

  const openItemAudience = (item: ShoppingItem) => {
    setActiveOptionsItemId(null);
    setEditingAudienceItem(item);
    setAudienceDraft(item.for_users);
    setAudienceError(null);
    setIsAudienceOpen(true);
  };

  const returnToItemOptions = () => {
    const itemId = editingAudienceItem?.id ?? null;
    setIsAudienceOpen(false);
    setEditingAudienceItem(null);
    setAudienceError(null);
    setActiveOptionsItemId(itemId);
  };

  const saveAudience = async () => {
    const normalizedAudience =
      audienceDraft.length === initialUsers.length ? [] : [...new Set(audienceDraft)].sort();

    if (!editingAudienceItem) {
      setForUsers(normalizedAudience);
      setIsAudienceOpen(false);
      return;
    }

    setIsSavingAudience(true);
    setAudienceError(null);
    const previousItem = editingAudienceItem;
    upsertItem({
      ...previousItem,
      for_users: normalizedAudience,
      updated_at: new Date().toISOString(),
    });
    setIsAudienceOpen(false);
    const result = await runClientAction(
      () =>
        updateShoppingAudienceAction({
          tripKey: urlKey,
          itemId: previousItem.id,
          forUsers: normalizedAudience,
        }),
      "Nie udało się zmienić rachunku.",
    );
    setIsSavingAudience(false);
    if (!result.ok) {
      upsertItem(previousItem);
      setAudienceError(result.error);
      setEditingAudienceItem(previousItem);
      setIsAudienceOpen(true);
      return;
    }

    upsertItem(result.item);
    broadcastInvalidate();
    setIsAudienceOpen(false);
    setEditingAudienceItem(null);
  };

  if (!modules.shopping || !activeUserId) {
    return (
      <div className="animate-fade-in flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <div className="bg-theme-card text-theme-muted border-theme-border flex h-16 w-16 items-center justify-center rounded-full border shadow-xs">
          <Lock size={28} />
        </div>
        <div>
          <h2 className="font-heading text-theme-text mb-2 text-3xl font-semibold">
            Lista niedostępna
          </h2>
          <p className="font-body text-theme-muted mx-auto mb-6 max-w-64 text-sm">
            Musisz najpierw wybrać swój profil w tym wyjeździe.
          </p>
          <Link.Arrow href={`/t/${urlKey}`} variant="primary" size="base">
            Wróć do Bazy
          </Link.Arrow>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in -mx-2 -mb-[calc(8.5rem+env(safe-area-inset-bottom))] pt-4">
      <section
        data-bottom-nav-tone="light"
        className="shopping-notebook pb-[calc(8.5rem+env(safe-area-inset-bottom))] shadow-none"
      >
        <span className="bg-theme-primary/45 absolute inset-y-0 left-6 w-px" />
        <div className="absolute top-4 left-0 flex w-full justify-around px-8">
          <span className="bg-theme-bg border-theme-border h-2 w-2 rounded-full border" />
          <span className="bg-theme-bg border-theme-border h-2 w-2 rounded-full border" />
          <span className="bg-theme-bg border-theme-border h-2 w-2 rounded-full border" />
          <span className="bg-theme-bg border-theme-border h-2 w-2 rounded-full border" />
          <span className="bg-theme-bg border-theme-border h-2 w-2 rounded-full border" />
          <span className="bg-theme-bg border-theme-border h-2 w-2 rounded-full border" />
        </div>

        <header className="px-5 pt-12 pb-4 pl-11">
          <h1 className="font-heading text-theme-text text-3xl font-semibold">Lista zakupów</h1>

          <div className="mt-3 flex min-h-8 items-center text-xs">
            <span className="text-theme-text font-bold">{openItems} do kupienia</span>
          </div>
        </header>

        {!isClosed && (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void addItem();
            }}
            className={cn(
              "border-theme-border/55 border-t px-5 py-3 pl-11",
              openItems > 0 && "border-b",
            )}
          >
            <div className="border-theme-border/80 bg-theme-bg/18 divide-theme-border/70 divide-y overflow-hidden rounded-xl border">
              <div className="flex min-h-12 items-center pl-3">
                <input
                  value={itemName}
                  onChange={(event) => setItemName(event.target.value)}
                  placeholder="Dopisz rzecz…"
                  autoComplete="off"
                  className="font-note text-theme-text placeholder:text-theme-muted/65 min-w-0 flex-1 bg-transparent text-lg leading-none outline-hidden"
                />
                <button
                  type="submit"
                  disabled={!itemName.trim() || isAdding}
                  className="text-theme-primary hover:bg-theme-primary/7 flex h-12 w-12 shrink-0 items-center justify-center disabled:opacity-25"
                  aria-label="Dodaj rzecz do listy"
                >
                  <Plus size={18} />
                </button>
              </div>
              <button
                type="button"
                onClick={openNewAudience}
                className="hover:bg-theme-primary/5 flex min-h-10 w-full items-center gap-2 px-3 text-left"
              >
                <ReceiptText className="text-theme-primary shrink-0" size={13} />
                <span className="text-theme-muted min-w-0 flex-1 truncate text-[10px]">
                  Rachunek:{" "}
                  <span className="text-theme-text font-bold">
                    {forUsers.length === 0
                      ? "wspólny"
                      : `osobny · ${formatAudienceNames(selectedUsers)}`}
                  </span>
                </span>
                <ChevronRight className="text-theme-muted shrink-0" size={15} />
              </button>
            </div>
            {addError && <p className="text-theme-danger mt-1 text-xs font-bold">{addError}</p>}
          </form>
        )}

        <ShoppingList
          items={items}
          users={initialUsers}
          activeUserId={activeUserId}
          activeOptionsItemId={activeOptionsItemId}
          onOptionsItemChange={setActiveOptionsItemId}
          onItemChanged={upsertItem}
          onItemDeleted={hidePendingDeletion}
          onItemDeletionCommitted={commitDeletion}
          onEditAudience={openItemAudience}
          onMutationCommitted={broadcastInvalidate}
          readOnly={isClosed}
        />
      </section>

      <ResponsiveDialog
        isOpen={isAudienceOpen}
        setIsOpen={(open) => {
          setIsAudienceOpen(open);
          if (!open) setEditingAudienceItem(null);
        }}
        title={editingAudienceItem ? "Zmień rachunek" : "Wybierz rachunek"}
        description="Wybierz osoby, których ma dotyczyć ta rzecz. Pozycje z tym samym składem pokażemy razem."
        onBack={editingAudienceItem ? returnToItemOptions : undefined}
      >
        <div className="flex flex-col gap-4">
          <button
            type="button"
            onClick={() => setAudienceDraft([])}
            className={cn(
              "border-theme-border flex min-h-14 items-center justify-between rounded-xl border px-3 text-left",
              audienceDraft.length === 0 && "border-theme-primary/40 bg-theme-primary/10",
            )}
          >
            <span>
              <span className="text-theme-text block text-sm font-bold">Rachunek wspólny</span>
              <span className="text-theme-muted mt-0.5 block text-[10px]">Dla całej ekipy</span>
            </span>
            {audienceDraft.length === 0 && <Check className="text-theme-primary" size={17} />}
          </button>

          {audiencePresets.length > 0 && (
            <div>
              <p className="text-theme-muted mb-2 text-[10px] font-bold tracking-wider uppercase">
                Ostatnie podziały
              </p>
              <div className="flex flex-wrap gap-2">
                {audiencePresets.map((preset) => {
                  const selected = sameAudience(audienceDraft, preset);
                  const presetUsers = initialUsers.filter((user) => preset.includes(user.id));
                  return (
                    <button
                      key={preset.join(":")}
                      type="button"
                      onClick={() => setAudienceDraft(preset)}
                      className={cn(
                        "border-theme-border min-h-10 rounded-full border px-3 text-[10px] font-bold",
                        selected &&
                          "border-theme-primary/40 bg-theme-primary/10 text-theme-primary",
                      )}
                    >
                      {formatAudienceNames(presetUsers)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <div className="mb-2 flex items-center gap-2">
              <UsersRound className="text-theme-primary" size={15} />
              <p className="text-theme-text text-xs font-bold">Osoby na rachunku</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {initialUsers.map((user) => {
                const selected = audienceDraft.includes(user.id);
                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() =>
                      setAudienceDraft((current) =>
                        selected ? current.filter((id) => id !== user.id) : [...current, user.id],
                      )
                    }
                    className={cn(
                      "border-theme-border flex min-h-13 items-center gap-2 rounded-xl border px-2.5 text-left text-xs font-bold",
                      selected && "border-theme-primary/40 bg-theme-primary/10",
                    )}
                  >
                    <Avatar
                      user={{ id: user.id, name: user.name, avatarUrl: user.avatar_url }}
                      className="h-7 w-7 text-[11px]"
                    />
                    <span className="min-w-0 flex-1 truncate">{user.name}</span>
                    {selected && <Check className="text-theme-primary shrink-0" size={14} />}
                  </button>
                );
              })}
            </div>
          </div>

          {audienceError && <p className="text-theme-danger text-xs font-bold">{audienceError}</p>}
          <Button type="button" disabled={isSavingAudience} onClick={() => void saveAudience()}>
            {editingAudienceItem ? "Zapisz rachunek" : "Użyj tego rachunku"}
          </Button>
        </div>
      </ResponsiveDialog>
    </div>
  );
}

function formatAudienceNames(users: User[]) {
  if (users.length === 0) return "wybrane osoby";
  if (users.length === 1) return `tylko ${users[0]!.name}`;
  if (users.length === 2) return `${users[0]!.name} i ${users[1]!.name}`;
  return `${users[0]!.name}, ${users[1]!.name} +${users.length - 2}`;
}

function sameAudience(first: string[], second: string[]) {
  const firstSorted = [...first].sort();
  const secondSorted = [...second].sort();
  return (
    firstSorted.length === secondSorted.length &&
    firstSorted.every((userId, index) => userId === secondSorted[index])
  );
}
