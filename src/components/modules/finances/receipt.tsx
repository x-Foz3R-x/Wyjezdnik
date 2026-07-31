"use client";

import { memo, useMemo } from "react";
import type { Database } from "~/types/database";
import {
  getExpenseParticipantShares,
  isSettlementEntry,
  type FinanceExpense,
  type FinanceMode,
  type SettlementStrategy,
  type Transaction,
} from "~/lib/finances";
import { ReceiptHeader } from "~/components/modules/finances/receipt-header";
import { ReceiptExpenseList } from "~/components/modules/finances/receipt-expense-list";
import { ReceiptSummary } from "~/components/modules/finances/receipt-summary";
import { ReceiptPaymentSection } from "~/components/modules/finances/receipt-payment-section";
import { ReceiptFooter } from "~/components/modules/finances/receipt-footer";
import { useTripRoute } from "~/providers/trip-route-provider";
import { CURRENCIES, parseCurrencyCode, type CurrencyCode } from "~/lib/currencies";

type User = Pick<Database["public"]["Tables"]["users"]["Row"], "id" | "name"> & {
  phone?: string | null;
};

interface ExpenseReceiptProps {
  expenses: FinanceExpense[];
  users: User[];
  activeUserId: string;
  defaultCurrency: CurrencyCode;
  ledgers: Partial<
    Record<
      CurrencyCode,
      {
        balance: number;
        debts: Transaction[];
        receivables: Transaction[];
        outstandingTotal: number;
        relationalTransactionCount: number;
        optimizedTransactionCount: number;
      }
    >
  >;
  financeMode: FinanceMode;
  settlementStrategy: SettlementStrategy;
  onDataChanged: () => void;
  onAddExpense: () => void;
  expenseReadOnly: boolean;
  settlementReadOnly: boolean;
  canViewAllExpenses: boolean;
  canManageExpenses: boolean;
}

export const ExpenseReceipt = memo(function ExpenseReceipt({
  expenses,
  users,
  activeUserId,
  defaultCurrency,
  ledgers,
  financeMode,
  settlementStrategy,
  onDataChanged,
  onAddExpense,
  expenseReadOnly,
  settlementReadOnly,
  canViewAllExpenses,
  canManageExpenses,
}: ExpenseReceiptProps) {
  const { tripId } = useTripRoute();
  const regularExpenses = useMemo(
    () => expenses.filter((expense) => !isSettlementEntry(expense)),
    [expenses],
  );
  const settlements = useMemo(() => expenses.filter(isSettlementEntry), [expenses]);
  const currencies = useMemo(() => {
    const used = new Set<CurrencyCode>();
    expenses.forEach((expense) => used.add(parseCurrencyCode(expense.currency)));
    (Object.keys(ledgers) as CurrencyCode[]).forEach((currency) => used.add(currency));
    if (used.size === 0) used.add(defaultCurrency);
    return CURRENCIES.map(({ code }) => code).filter((currency) => used.has(currency));
  }, [defaultCurrency, expenses, ledgers]);
  const summaries = useMemo(
    () =>
      currencies.map((currency) => {
        const currencyExpenses = regularExpenses.filter(
          (expense) => parseCurrencyCode(expense.currency) === currency,
        );
        const totalCost = currencyExpenses.reduce(
          (sum, expense) => sum + Number(expense.amount),
          0,
        );
        const paidByUser = new Map<string, number>();
        let activeUserShare = 0;

        for (const expense of currencyExpenses) {
          paidByUser.set(
            expense.user_id,
            (paidByUser.get(expense.user_id) ?? 0) + Number(expense.amount),
          );
          activeUserShare +=
            getExpenseParticipantShares(expense, financeMode).find(
              (share) => share.userId === activeUserId,
            )?.amount ?? 0;
        }

        const largest = currencyExpenses.reduce<FinanceExpense | null>(
          (current, expense) =>
            !current || Number(expense.amount) > Number(current.amount) ? expense : current,
          null,
        );

        return {
          currency,
          totalCost,
          outstandingTotal: ledgers[currency]?.outstandingTotal ?? 0,
          expenseCount: currencyExpenses.length,
          averageExpense: currencyExpenses.length > 0 ? totalCost / currencyExpenses.length : 0,
          activeUserPaid: paidByUser.get(activeUserId) ?? 0,
          activeUserShare,
          largestExpense: largest
            ? { description: largest.description, amount: Number(largest.amount) }
            : null,
          payerBreakdown: [...paidByUser.entries()]
            .sort((first, second) => second[1] - first[1])
            .map(([userId, amount]) => ({
              id: userId,
              name: users.find((user) => user.id === userId)?.name ?? "Nieznany",
              amount,
            })),
        };
      }),
    [activeUserId, currencies, financeMode, ledgers, regularExpenses, users],
  );
  const activeUserName = users.find((user) => user.id === activeUserId)?.name ?? "Uczestnik";
  const tripIdShort = tripId.split("-")[0]?.toUpperCase() ?? "00000000";
  const issuedAt = new Date().toLocaleDateString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const isEmpty = expenses.length === 0;

  return (
    <section
      data-bottom-nav-tone="light"
      className="thermal-receipt text-receipt-ink -mx-2 mt-4 w-auto max-w-none px-5 py-7 font-mono"
    >
      <ReceiptHeader
        tripIdShort={tripIdShort}
        issuedAt={issuedAt}
        activeUserName={activeUserName}
        financeMode={financeMode}
        isEmpty={isEmpty}
        onAddExpense={expenseReadOnly ? undefined : onAddExpense}
      />
      <ReceiptExpenseList
        expenses={regularExpenses}
        users={users}
        activeUserId={activeUserId}
        financeMode={financeMode}
        canViewAllExpenses={canViewAllExpenses}
        canManageExpenses={canManageExpenses}
        onDataChanged={onDataChanged}
      />
      <ReceiptSummary
        summaries={summaries}
        canViewAllExpenses={canViewAllExpenses}
        financeMode={financeMode}
      />
      {!isEmpty && (
        <>
          {currencies.map((currency) => {
            const ledger = ledgers[currency] ?? {
              balance: 0,
              debts: [],
              receivables: [],
              outstandingTotal: 0,
              relationalTransactionCount: 0,
              optimizedTransactionCount: 0,
            };
            const currencySettlements = settlements.filter(
              (settlement) => parseCurrencyCode(settlement.currency) === currency,
            );

            return (
              <ReceiptPaymentSection
                key={currency}
                settlements={currencySettlements}
                users={users}
                activeUserId={activeUserId}
                currency={currency}
                balance={ledger.balance}
                debts={ledger.debts}
                receivables={ledger.receivables}
                financeMode={financeMode}
                settlementStrategy={settlementStrategy}
                relationalTransactionCount={ledger.relationalTransactionCount}
                optimizedTransactionCount={ledger.optimizedTransactionCount}
                onDataChanged={onDataChanged}
                readOnly={settlementReadOnly}
                showCurrencyInHeading={currencies.length > 1}
              />
            );
          })}
          <ReceiptFooter tripIdShort={tripIdShort} />
        </>
      )}
    </section>
  );
});
