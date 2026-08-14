"use client";

import { memo, useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Circle,
  MoreHorizontal,
  Plus,
  ReceiptText,
  Trash2,
} from "lucide-react";
import {
  clearCompletedShoppingItemsAction,
  deleteShoppingItemAction,
  toggleShoppingItemAction,
} from "~/app/actions/shopping";
import { ResponsiveDialog } from "~/components/ui/responsive-dialog";
import { Avatar } from "~/components/ui/avatar";
import { useTripRoute } from "~/providers/trip-route-provider";
import type { Database } from "~/types/database";
import { runClientAction } from "~/lib/client-action";
import { cn } from "~/lib/utils";

type ShoppingItem = Database["public"]["Tables"]["shopping_list"]["Row"];
type User = Pick<Database["public"]["Tables"]["users"]["Row"], "id" | "name" | "avatar_url">;

export const ShoppingList = memo(function ShoppingList({
  items,
  users,
  activeUserId,
  activeOptionsItemId,
  onOptionsItemChange,
  onItemChanged,
  onItemDeleted,
  onItemDeletionCommitted,
  onEditAudience,
  onMutationCommitted,
  readOnly,
}: {
  items: ShoppingItem[];
  users: User[];
  activeUserId: string;
  activeOptionsItemId: string | null;
  onOptionsItemChange: (itemId: string | null) => void;
  onItemChanged: (item: ShoppingItem) => void;
  onItemDeleted: (itemId: string) => void;
  onItemDeletionCommitted: (itemId: string) => void;
  onEditAudience: (item: ShoppingItem) => void;
  onMutationCommitted: () => void;
  readOnly: boolean;
}) {
  const { urlKey } = useTripRoute();
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [isClearing, setIsClearing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const completedItems = items.filter((item) => item.is_completed);
  const openItemsCount = items.length - completedItems.length;
  const groups = useMemo(
    () => groupShoppingItems(showCompleted ? items : items.filter((item) => !item.is_completed)),
    [items, showCompleted],
  );
  const menuItem = items.find((item) => item.id === activeOptionsItemId) ?? null;

  const getUser = (userId: string | null) => users.find((user) => user.id === userId) ?? null;
  const getUserName = (userId: string | null) => getUser(userId)?.name ?? "Nieznany";

  const setLoading = (itemId: string, loading: boolean) => {
    setLoadingIds((current) => {
      const next = new Set(current);
      if (loading) next.add(itemId);
      else next.delete(itemId);
      return next;
    });
  };

  const toggle = async (item: ShoppingItem) => {
    if (readOnly || loadingIds.has(item.id)) return;
    const optimistic: ShoppingItem = {
      ...item,
      is_completed: !item.is_completed,
      completed_by: !item.is_completed ? activeUserId : null,
      completed_at: !item.is_completed ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    };
    onItemChanged(optimistic);
    setLoading(item.id, true);
    setActionError(null);

    const result = await runClientAction(
      () =>
        toggleShoppingItemAction({
          tripKey: urlKey,
          itemId: item.id,
          isCompleted: optimistic.is_completed,
        }),
      "Nie udało się zaktualizować produktu.",
    );
    setLoading(item.id, false);

    if (result.ok) {
      onItemChanged(result.item);
      onMutationCommitted();
    } else {
      onItemChanged(item);
      setActionError(result.error);
    }
  };

  const remove = async (item: ShoppingItem) => {
    if (readOnly || loadingIds.has(item.id)) return;
    if (!window.confirm(`Usunąć „${item.item_name}” z listy zakupów?`)) return;

    onOptionsItemChange(null);
    onItemDeleted(item.id);
    setLoading(item.id, true);
    setActionError(null);
    const result = await runClientAction(
      () => deleteShoppingItemAction({ tripKey: urlKey, itemId: item.id }),
      "Nie udało się usunąć produktu.",
    );
    setLoading(item.id, false);
    if (!result.ok) {
      onItemChanged(item);
      setActionError(result.error);
    } else {
      onItemDeletionCommitted(item.id);
      onMutationCommitted();
    }
  };

  const clearCompleted = async () => {
    if (readOnly || completedItems.length === 0 || loadingIds.size > 0 || isClearing) return;
    if (!window.confirm(`Usunąć ${completedItems.length} skreślonych pozycji?`)) return;

    setIsClearing(true);
    completedItems.forEach((item) => setLoading(item.id, true));
    completedItems.forEach((item) => onItemDeleted(item.id));
    setActionError(null);
    const result = await runClientAction(
      () => clearCompletedShoppingItemsAction({ tripKey: urlKey }),
      "Nie udało się usunąć skreślonych rzeczy.",
    );
    setIsClearing(false);
    completedItems.forEach((item) => setLoading(item.id, false));
    if (!result.ok) {
      completedItems.forEach(onItemChanged);
      setActionError(result.error);
    } else {
      completedItems.forEach((item) => onItemDeletionCommitted(item.id));
      onMutationCommitted();
    }
  };

  if (items.length === 0) {
    return (
      <div className="px-5 py-12 pl-11 text-center">
        <ShoppingBasketEmpty />
        <p className="text-theme-text mt-3 text-sm font-bold">Kartka jest jeszcze pusta</p>
        <p className="text-theme-muted mt-1 text-xs">Dopisz pierwszą rzecz powyżej.</p>
      </div>
    );
  }

  return (
    <div className="px-5 pb-3 pl-11">
      {actionError && (
        <p className="border-theme-danger/30 bg-theme-danger/8 text-theme-danger my-3 rounded-xl border px-3 py-2 text-xs font-bold">
          {actionError}
        </p>
      )}

      <div className={cn("flex flex-col gap-6", groups.length > 0 && "py-2")}>
        {groups.map((group) => {
          const groupUsers =
            group.userIds.length === 0
              ? []
              : group.userIds.map((userId) => getUser(userId)).filter(isUser);
          const openCount = group.items.filter((item) => !item.is_completed).length;

          return (
            <section key={group.key}>
              <div className="mb-1 flex min-h-11 items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-theme-text truncate text-[13px] font-bold">
                    {group.userIds.length === 0
                      ? "Wspólny rachunek"
                      : formatAudienceNames(groupUsers)}
                  </p>
                  <p className="text-theme-muted mt-0.5 truncate text-[10px]">
                    {group.userIds.length === 0
                      ? `Cała ekipa · ${formatItemCount(openCount, group.items.length)}`
                      : `Osobny rachunek · ${formatItemCount(openCount, group.items.length)}`}
                  </p>
                </div>
                {groupUsers.length > 0 && <AvatarStack users={groupUsers} />}
              </div>

              <div className="divide-theme-border/55 divide-y">
                {group.items.map((item) => {
                  const isLoading = loadingIds.has(item.id);

                  return (
                    <article
                      key={item.id}
                      className={cn(
                        "flex items-center gap-1.5 transition-all",
                        item.is_completed ? "min-h-13 py-1.5" : "min-h-14 py-2",
                        isLoading && "opacity-55",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => void toggle(item)}
                        disabled={isLoading || readOnly}
                        className="text-theme-muted hover:text-theme-primary flex h-10 w-8 shrink-0 items-center justify-center transition"
                        aria-label={
                          item.is_completed
                            ? `Przywróć ${item.item_name}`
                            : `Skreśl ${item.item_name}`
                        }
                      >
                        {item.is_completed ? (
                          <Check className="text-theme-primary" size={18} strokeWidth={2.35} />
                        ) : (
                          <Circle size={17} strokeWidth={1.35} />
                        )}
                      </button>

                      <div className="min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => void toggle(item)}
                          disabled={isLoading || readOnly}
                          className="block min-h-8 max-w-full py-1 text-left"
                        >
                          <span
                            className={cn(
                              "font-note text-theme-text line-clamp-2 block text-lg leading-6 wrap-break-word transition",
                              item.is_completed &&
                                "text-theme-muted decoration-theme-muted/70 line-clamp-2 line-through decoration-2",
                            )}
                          >
                            {item.item_name}
                          </span>
                        </button>
                      </div>

                      {!readOnly && (
                        <button
                          type="button"
                          onClick={() => onOptionsItemChange(item.id)}
                          disabled={isLoading}
                          className="text-theme-muted/70 hover:text-theme-text flex size-10 shrink-0 items-center justify-center rounded-full"
                          aria-label={`Więcej opcji dla ${item.item_name}`}
                        >
                          <MoreHorizontal size={19} />
                        </button>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {completedItems.length > 0 && (
        <div
          className={cn(
            "flex flex-col",
            openItemsCount > 0 && "border-theme-border/55 mt-2 border-t pt-2",
          )}
        >
          <button
            type="button"
            onClick={() => setShowCompleted((current) => !current)}
            className="text-theme-muted hover:text-theme-text flex min-h-11 w-full items-center justify-center gap-2 text-[10px] font-bold"
          >
            {showCompleted ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {showCompleted ? "Ukryj skreślone" : `Pokaż skreślone (${completedItems.length})`}
          </button>
          {showCompleted && !readOnly && (
            <button
              type="button"
              onClick={() => void clearCompleted()}
              disabled={isClearing}
              className="text-theme-muted hover:text-theme-danger flex min-h-10 w-full items-center justify-center gap-2 text-[9px]"
            >
              <Trash2 size={13} /> {isClearing ? "Usuwanie…" : "Usuń wszystkie skreślone"}
            </button>
          )}
        </div>
      )}

      <ResponsiveDialog
        isOpen={Boolean(menuItem)}
        setIsOpen={(open) => !open && onOptionsItemChange(null)}
        title={menuItem?.item_name}
      >
        {menuItem && (
          <div className="flex flex-col gap-2">
            <div className="text-theme-muted border-theme-border mb-2 flex flex-wrap gap-x-3 gap-y-1 border-b pb-3 text-[10px]">
              <span>Dodał: {getUserName(menuItem.added_by)}</span>
              {menuItem.is_completed && menuItem.completed_by && (
                <span>Skreślił: {getUserName(menuItem.completed_by)}</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                onOptionsItemChange(null);
                onEditAudience(menuItem);
              }}
              className="border-theme-border text-theme-text flex min-h-14 items-center gap-3 rounded-xl border px-4 text-left text-sm font-bold"
            >
              <ReceiptText className="text-theme-primary" size={18} />
              Zmień rachunek
            </button>
            <button
              type="button"
              onClick={() => void remove(menuItem)}
              className="border-theme-danger/25 text-theme-danger mt-2 flex min-h-14 items-center gap-3 rounded-xl border px-4 text-left text-sm font-bold"
            >
              <Trash2 size={18} /> Usuń z listy zakupów
            </button>
          </div>
        )}
      </ResponsiveDialog>
    </div>
  );
});

function groupShoppingItems(items: ShoppingItem[]) {
  const groups = new Map<string, { key: string; userIds: string[]; items: ShoppingItem[] }>();

  items.forEach((item) => {
    const userIds = [...new Set(item.for_users)].sort();
    const key = userIds.length === 0 ? "everyone" : userIds.join(":");
    const current = groups.get(key) ?? { key, userIds, items: [] };
    current.items.push(item);
    groups.set(key, current);
  });

  return [...groups.values()].sort((first, second) => {
    if (first.key === "everyone") return -1;
    if (second.key === "everyone") return 1;
    return first.items[0]!.created_at.localeCompare(second.items[0]!.created_at);
  });
}

function formatAudienceNames(users: User[]) {
  if (users.length === 0) return "Wybrane osoby";
  if (users.length === 1) return `Tylko ${users[0]!.name}`;
  if (users.length === 2) return `${users[0]!.name} i ${users[1]!.name}`;
  return `${users[0]!.name}, ${users[1]!.name} +${users.length - 2}`;
}

function formatItemCount(openCount: number, visibleCount: number) {
  if (openCount === 0) return `${visibleCount} skreślone`;
  if (openCount === 1) return "1 do kupienia";
  return `${openCount} do kupienia`;
}

function AvatarStack({ users }: { users: User[] }) {
  const [isLabelVisible, setIsLabelVisible] = useState(false);
  const label = users.map((user) => user.name).join(", ");

  return (
    <div className="group relative shrink-0">
      <button
        type="button"
        onClick={() => setIsLabelVisible((visible) => !visible)}
        onBlur={() => setIsLabelVisible(false)}
        className="flex -space-x-1.5"
        aria-label={`Osoby na rachunku: ${label}`}
        aria-expanded={isLabelVisible}
      >
        {users.slice(0, 3).map((user) => (
          <Avatar
            key={user.id}
            user={{ id: user.id, name: user.name, avatarUrl: user.avatar_url }}
            className="ring-theme-card size-6 text-[10px] ring-2"
          />
        ))}
        {users.length > 3 && (
          <span className="bg-theme-card-raised text-theme-text ring-theme-card flex size-6 items-center justify-center rounded-full text-[8px] font-bold ring-2">
            +{users.length - 3}
          </span>
        )}
      </button>

      <span
        role="tooltip"
        className={cn(
          "bg-theme-card-raised border-theme-border text-theme-text pointer-events-none absolute right-0 bottom-full z-20 mb-2 w-max max-w-48 rounded-lg border px-2.5 py-1.5 text-right text-[10px] leading-snug shadow-lg transition",
          isLabelVisible
            ? "translate-y-0 opacity-100"
            : "translate-y-1 opacity-0 group-hover:translate-y-0 group-hover:opacity-100",
        )}
      >
        {label}
      </span>
    </div>
  );
}

function ShoppingBasketEmpty() {
  return (
    <span className="border-theme-border text-theme-muted mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-dashed">
      <Plus size={18} />
    </span>
  );
}

function isUser(user: User | null): user is User {
  return Boolean(user);
}
