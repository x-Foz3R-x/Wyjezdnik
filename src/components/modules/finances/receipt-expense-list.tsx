"use client";

import { memo, useMemo, useState } from "react";
import type { Database } from "~/types/database";
import {
  formatFinanceAmount,
  getExplicitExpenseShares,
  getExpenseParticipantShares,
  type FinanceExpense,
  type FinanceMode,
} from "~/lib/finances";
import { ResponsiveDialog } from "~/components/responsive-dialog";
import { Button } from "~/components/ui/button";
import { ExpenseForm } from "~/components/modules/finances/receipt-form";
import { deleteExpenseAction } from "~/app/actions/finances";
import { useTripRoute } from "~/providers/trip-route-provider";
import { runClientAction } from "~/lib/client-action";
import { parseCurrencyCode } from "~/lib/currencies";

type User = Pick<Database["public"]["Tables"]["users"]["Row"], "id" | "name">;

interface ReceiptExpenseListProps {
  expenses: FinanceExpense[];
  users: User[];
  activeUserId: string;
  financeMode: FinanceMode;
  canViewAllExpenses: boolean;
  canManageExpenses: boolean;
  onDataChanged: () => void;
}

const INITIAL_VISIBLE_EXPENSES = 4;

export const ReceiptExpenseList = memo(function ReceiptExpenseList({
  expenses,
  users,
  activeUserId,
  financeMode,
  canViewAllExpenses,
  canManageExpenses,
  onDataChanged,
}: ReceiptExpenseListProps) {
  const { urlKey, userId } = useTripRoute();
  const [isExpanded, setIsExpanded] = useState(false);
  const [scope, setScope] = useState<"mine" | "all">("mine");
  const [selectedExpense, setSelectedExpense] = useState<FinanceExpense | null>(null);
  const [editingExpense, setEditingExpense] = useState<FinanceExpense | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [hiddenExpenseIds, setHiddenExpenseIds] = useState<Set<string>>(() => new Set());
  const [actionError, setActionError] = useState<string | null>(null);
  const newestFirstExpenses = useMemo(
    () =>
      expenses
        .filter((expense) => !hiddenExpenseIds.has(expense.id))
        .filter((expense) => {
          if (scope === "all" || expense.user_id === activeUserId) return true;
          return getExpenseParticipantShares(expense, financeMode).some(
            (share) => share.userId === activeUserId && share.amount > 0,
          );
        })
        .sort((first, second) => {
          const firstDate = first.created_at ? new Date(first.created_at).getTime() : 0;
          const secondDate = second.created_at ? new Date(second.created_at).getTime() : 0;
          return secondDate - firstDate;
        }),
    [activeUserId, expenses, financeMode, hiddenExpenseIds, scope],
  );
  const otherExpensesCount = useMemo(
    () =>
      expenses.filter(
        (expense) =>
          expense.user_id !== activeUserId &&
          !getExpenseParticipantShares(expense, financeMode).some(
            (share) => share.userId === activeUserId && share.amount > 0,
          ),
      ).length,
    [activeUserId, expenses, financeMode],
  );
  const hasMoreExpenses = newestFirstExpenses.length > INITIAL_VISIBLE_EXPENSES;
  const visibleExpenses =
    isExpanded || !hasMoreExpenses
      ? newestFirstExpenses
      : newestFirstExpenses.slice(0, INITIAL_VISIBLE_EXPENSES);
  const hiddenExpensesCount = newestFirstExpenses.length - INITIAL_VISIBLE_EXPENSES;
  const getUserName = (userId: string) =>
    users.find((user) => user.id === userId)?.name ?? "Nieznany";
  const selectedShares = selectedExpense
    ? getExpenseParticipantShares(selectedExpense, financeMode)
    : [];

  const removeSelectedExpense = async () => {
    if (!selectedExpense || isDeleting) return;
    if (!window.confirm(`Usunąć wydatek „${selectedExpense.description}”?`)) return;

    const expense = selectedExpense;
    setIsDeleting(true);
    setActionError(null);
    setHiddenExpenseIds((current) => new Set(current).add(expense.id));
    setSelectedExpense(null);
    const result = await runClientAction(
      () =>
        deleteExpenseAction({
          tripKey: urlKey,
          expenseId: expense.id,
        }),
      "Nie udało się usunąć wydatku.",
    );
    setIsDeleting(false);

    if (!result.ok) {
      setHiddenExpenseIds((current) => {
        const next = new Set(current);
        next.delete(expense.id);
        return next;
      });
      setSelectedExpense(expense);
      setActionError(result.error);
      return;
    }

    onDataChanged();
  };

  return (
    <>
      <section className="mt-5">
        <div className="mb-2 flex min-h-8 items-center justify-end gap-1.5 text-[9px] font-bold uppercase">
          <span className="text-receipt-muted mr-auto">Widok historii</span>
          {canViewAllExpenses ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setScope("mine");
                  setIsExpanded(false);
                }}
                className={
                  scope === "mine"
                    ? "text-receipt-ink border-receipt-ink min-h-8 border-b font-black"
                    : "text-receipt-muted min-h-8"
                }
              >
                Moje
              </button>
              <span className="text-receipt-line">/</span>
              <button
                type="button"
                onClick={() => {
                  setScope("all");
                  setIsExpanded(false);
                }}
                className={
                  scope === "all"
                    ? "text-receipt-ink border-receipt-ink min-h-8 border-b font-black"
                    : "text-receipt-muted min-h-8"
                }
              >
                Wszystkie{otherExpensesCount > 0 ? ` · ${expenses.length}` : ""}
              </button>
            </>
          ) : (
            <span className="text-receipt-ink">Tylko dotyczące Ciebie</span>
          )}
        </div>
        <div className="border-receipt-line grid grid-cols-[2rem_1fr_auto] border-b border-dashed pb-1 text-[10px] font-bold uppercase">
          <span>LP</span>
          <span>Nazwa / płatnik</span>
          <span>Kwota</span>
        </div>

        {visibleExpenses.length === 0 ? (
          <p className="text-receipt-muted border-receipt-line border-b border-dashed py-6 text-center text-[10px] font-semibold uppercase">
            {scope === "mine" && expenses.length > 0
              ? "Żadna pozycja na tym paragonie Cię nie dotyczy"
              : "Brak pozycji na paragonie"}
          </p>
        ) : (
          <ol>
            {visibleExpenses.map((expense, index) => {
              const participantShares = getExpenseParticipantShares(expense, financeMode);
              const participantNames = participantShares
                .filter((share) => share.amount > 0)
                .map((share) => getUserName(share.userId));
              const includesEveryone =
                participantShares.length === users.length &&
                users.every((user) =>
                  participantShares.some((share) => share.userId === user.id && share.amount > 0),
                );
              return (
                <li key={expense.id} className="border-receipt-line border-b border-dotted">
                  <button
                    type="button"
                    onClick={() => setSelectedExpense(expense)}
                    className="grid min-h-16 w-full grid-cols-[2rem_1fr_auto] gap-y-1 py-2.5 text-left"
                    aria-label={`Pokaż szczegóły wydatku ${expense.description}`}
                  >
                    <span className="text-receipt-muted text-[10px] font-semibold">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="text-receipt-ink min-w-0 pr-2 text-xs leading-tight font-black uppercase">
                      {expense.description}
                    </span>
                    <span className="text-receipt-ink text-right text-xs font-black">
                      {formatFinanceAmount(Number(expense.amount), financeMode, {
                        currency: parseCurrencyCode(expense.currency),
                      })}
                    </span>
                    <span />
                    <span className="text-receipt-muted col-span-2 text-[10px] leading-snug font-semibold">
                      Płaci: {getUserName(expense.user_id)}
                    </span>
                    <span />
                    <span className="text-receipt-muted col-span-2 text-[10px] leading-snug">
                      Liczeni:{" "}
                      {includesEveryone ? "Wszyscy" : participantNames.join(", ") || "brak"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        )}

        {hasMoreExpenses && (
          <button
            type="button"
            onClick={() => setIsExpanded((previous) => !previous)}
            className="text-receipt-stamp mt-2 min-h-10 w-full text-[10px] font-black tracking-widest uppercase"
          >
            {isExpanded ? "— Zwiń historię —" : `— Starsze pozycje: ${hiddenExpensesCount} —`}
          </button>
        )}
      </section>

      <ResponsiveDialog
        isOpen={selectedExpense !== null}
        setIsOpen={(isOpen) => {
          if (!isOpen) setSelectedExpense(null);
        }}
        title={selectedExpense?.description}
        description="Szczegóły pozycji na paragonie"
      >
        {selectedExpense && (
          <div className="space-y-5">
            <dl className="border-theme-border divide-theme-border divide-y overflow-hidden rounded-2xl border">
              <ExpenseDetailRow
                label="Kwota"
                value={formatFinanceAmount(Number(selectedExpense.amount), financeMode, {
                  currency: parseCurrencyCode(selectedExpense.currency),
                })}
              />
              <ExpenseDetailRow label="Zapłacił/a" value={getUserName(selectedExpense.user_id)} />
              <ExpenseDetailRow
                label="Wpisał/a"
                value={getUserName(selectedExpense.created_by ?? selectedExpense.user_id)}
              />
              <ExpenseDetailRow
                label="Podział"
                value={
                  getExplicitExpenseShares(selectedExpense).length > 0
                    ? "Kwoty wpisane ręcznie"
                    : "Równo między wskazane osoby"
                }
              />
              <ExpenseDetailRow
                label="Dodano"
                value={
                  selectedExpense.created_at
                    ? new Intl.DateTimeFormat("pl-PL", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(selectedExpense.created_at))
                    : "Brak daty"
                }
              />
            </dl>

            <section>
              <h3 className="text-theme-text text-sm font-bold">Kto został policzony</h3>
              <div className="border-theme-border mt-2 overflow-hidden rounded-2xl border">
                {selectedShares.map((share) => (
                  <div
                    key={share.userId}
                    className="border-theme-border flex min-h-12 items-center justify-between gap-4 border-b px-4 last:border-b-0"
                  >
                    <span className="text-theme-text text-sm">{getUserName(share.userId)}</span>
                    <span className="text-theme-primary text-sm font-bold">
                      {formatFinanceAmount(share.amount, financeMode, {
                        currency: parseCurrencyCode(selectedExpense.currency),
                      })}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {actionError && (
              <p className="border-theme-danger/30 bg-theme-danger/8 text-theme-danger rounded-xl border px-3 py-2 text-xs">
                {actionError}
              </p>
            )}

            {canManageExpenses && (
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingExpense(selectedExpense);
                    setSelectedExpense(null);
                  }}
                >
                  Popraw
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isDeleting}
                  className="border-theme-danger/35 text-theme-danger"
                  onClick={() => void removeSelectedExpense()}
                >
                  {isDeleting ? "Usuwanie…" : "Usuń"}
                </Button>
              </div>
            )}
          </div>
        )}
      </ResponsiveDialog>

      <ResponsiveDialog
        isOpen={editingExpense !== null}
        setIsOpen={(isOpen) => {
          if (!isOpen) setEditingExpense(null);
        }}
        title="Popraw wydatek"
        description="Zmiana zostanie zapisana w historii rozliczeń."
      >
        {editingExpense && (
          <ExpenseForm
            key={editingExpense.id}
            users={users}
            activeUserId={userId ?? editingExpense.user_id}
            expense={editingExpense}
            onSuccess={() => {
              setEditingExpense(null);
              onDataChanged();
            }}
          />
        )}
      </ResponsiveDialog>
    </>
  );
});

function ExpenseDetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-h-12 items-center justify-between gap-4 px-4">
      <dt className="text-theme-muted text-sm">{label}</dt>
      <dd className="text-theme-text text-right text-sm font-bold">{value}</dd>
    </div>
  );
}
