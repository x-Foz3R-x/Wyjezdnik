import type { Database } from "~/types/database";
import { getCurrency, type CurrencyCode } from "~/lib/currencies";

export type FinanceShare = Pick<
  Database["public"]["Tables"]["expense_shares"]["Row"],
  "user_id" | "amount"
>;
export type FinanceExpense = Database["public"]["Tables"]["expenses"]["Row"] & {
  expense_shares?: FinanceShare[];
};
export type User = Pick<Database["public"]["Tables"]["users"]["Row"], "id" | "name">;
export type FinanceMode = "legacy" | "whole" | "precise";
export type SettlementStrategy = "relational" | "optimized";
export type SettlementStatus = "pending" | "confirmed" | "rejected";

export interface Transaction {
  from: string;
  to: string;
  amount: number;
}

export interface ExpenseParticipantShare {
  userId: string;
  amount: number;
}

const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export function parseFinanceMode(value: unknown): FinanceMode {
  return value === "whole" || value === "precise" || value === "legacy" ? value : "legacy";
}

export function getFinanceModeLabel(mode: FinanceMode) {
  if (mode === "whole") return "Pełne jednostki";
  if (mode === "precise") return "Dokładnie do grosza";
  return "Dotychczasowe rozliczenie";
}

export function parseSettlementStrategy(value: unknown): SettlementStrategy {
  return value === "optimized" || value === "relational" ? value : "relational";
}

export function getSettlementStrategyLabel(strategy: SettlementStrategy) {
  return strategy === "optimized" ? "Mniej przelewów" : "Między właściwymi osobami";
}

export function formatFinanceAmount(
  value: number,
  mode: FinanceMode,
  options: { currency?: CurrencyCode | true; sign?: boolean } = {},
) {
  const normalizedValue = Math.abs(value) < 0.005 ? 0 : value;
  const sign = options.sign && normalizedValue !== 0 ? (normalizedValue > 0 ? "+" : "−") : "";
  const fractionDigits = mode === "whole" && Number.isInteger(normalizedValue) ? 0 : 2;
  const formatted = Math.abs(normalizedValue).toLocaleString("pl-PL", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
  const currency = options.currency
    ? getCurrency(options.currency === true ? "PLN" : options.currency)
    : null;

  return `${sign}${formatted}${currency ? ` ${currency.symbol}` : ""}`;
}

const isLegacySettlement = (expense: FinanceExpense): boolean =>
  expense.description.trim().toLowerCase() === "spłata długu";

export const isSettlementEntry = (expense: FinanceExpense): boolean =>
  expense.entry_type === "settlement" || (!expense.entry_type && isLegacySettlement(expense));

export const getSettlementRecipientId = (expense: FinanceExpense): string | null =>
  expense.settlement_recipient_id ?? expense.split_among[0] ?? null;

export const getSettlementStatus = (expense: FinanceExpense): SettlementStatus | null => {
  if (!isSettlementEntry(expense)) return null;
  return (expense.settlement_status as SettlementStatus) ?? "confirmed";
};

export function getExplicitExpenseShares(expense: FinanceExpense) {
  return (expense.expense_shares ?? []).filter(
    (share) => Number.isFinite(Number(share.amount)) && Number(share.amount) > 0,
  );
}

export function getExpenseParticipantShares(
  expense: FinanceExpense,
  mode: FinanceMode,
): ExpenseParticipantShare[] {
  const amount = Number(expense.amount);
  if (!Number.isFinite(amount) || amount <= 0) return [];

  const explicitShares = getExplicitExpenseShares(expense);
  if (explicitShares.length > 0) {
    const shares = explicitShares.map((share) => ({
      userId: share.user_id,
      amount: Number(share.amount),
    }));
    const payerShare = Math.max(
      0,
      mode === "whole"
        ? amount - shares.reduce((sum, share) => sum + share.amount, 0)
        : roundMoney(amount - shares.reduce((sum, share) => sum + share.amount, 0)),
    );

    return payerShare > 0 ? [{ userId: expense.user_id, amount: payerShare }, ...shares] : shares;
  }

  const participantIds = [...new Set(expense.split_among)].filter(Boolean);
  if (participantIds.length === 0) return [];

  return getEqualExpenseParticipantShares(amount, participantIds, expense.user_id, mode);
}

export function getEqualExpenseParticipantShares(
  amount: number,
  participantIds: string[],
  payerId: string,
  mode: FinanceMode,
): ExpenseParticipantShare[] {
  const uniqueParticipantIds = [...new Set(participantIds)].filter(Boolean);
  if (!Number.isFinite(amount) || amount <= 0 || uniqueParticipantIds.length === 0) return [];

  if (mode === "legacy") {
    return uniqueParticipantIds.map((userId) => ({
      userId,
      amount: roundMoney(amount / uniqueParticipantIds.length),
    }));
  }

  if (mode === "whole") {
    const roundedShare = Math.round(amount / uniqueParticipantIds.length);
    let remainingWholeUnits = Math.floor(amount);
    const shares = uniqueParticipantIds
      .filter((userId) => userId !== payerId)
      .map((userId) => {
        const share = Math.max(0, Math.min(roundedShare, remainingWholeUnits));
        remainingWholeUnits -= share;
        return { userId, amount: share };
      });
    const othersTotal = shares.reduce((sum, share) => sum + share.amount, 0);
    const payerShare = Math.max(0, roundMoney(amount - othersTotal));

    return uniqueParticipantIds.map((userId) =>
      userId === payerId
        ? { userId, amount: payerShare }
        : (shares.find((share) => share.userId === userId) ?? { userId, amount: 0 }),
    );
  }

  const factor = 100;
  const amountInUnits = Math.round(amount * factor);
  const equalShare = Math.floor(amountInUnits / uniqueParticipantIds.length);
  const payerRemainder = amountInUnits - equalShare * uniqueParticipantIds.length;

  return uniqueParticipantIds.map((userId) => ({
    userId,
    amount: (equalShare + (userId === payerId ? payerRemainder : 0)) / factor,
  }));
}

export function calculateFinances(
  expenses: FinanceExpense[],
  users: User[],
  mode: FinanceMode = "legacy",
  strategy: SettlementStrategy = "relational",
) {
  const result =
    mode === "legacy"
      ? calculateLegacyFinances(expenses, users)
      : calculateGlobalFinances(expenses, users, mode);
  const optimizedTransactions = optimizeTransactions(result.relationalTransactions);

  return {
    balances: result.balances,
    relationalTransactions: result.relationalTransactions,
    optimizedTransactions,
    transactions: strategy === "optimized" ? optimizedTransactions : result.relationalTransactions,
  };
}

function calculateGlobalFinances(
  expenses: FinanceExpense[],
  users: User[],
  mode: Exclude<FinanceMode, "legacy">,
) {
  const factor = mode === "whole" ? 1 : 100;
  const matrix = createDebtMatrix(users);
  const participantIds = new Set(users.map((user) => user.id));
  const addObligation = (creditorId: string, debtorId: string, amountInUnits: number) => {
    if (creditorId === debtorId || amountInUnits <= 0 || !matrix[creditorId] || !matrix[debtorId]) {
      return;
    }

    matrix[creditorId]![debtorId] = (matrix[creditorId]![debtorId] ?? 0) + amountInUnits;
    matrix[debtorId]![creditorId] = (matrix[debtorId]![creditorId] ?? 0) - amountInUnits;
  };

  for (const expense of expenses) {
    const amount = Number(expense.amount);
    if (!Number.isFinite(amount) || amount <= 0) continue;

    const amountInUnits = Math.round(amount * factor);

    if (isSettlementEntry(expense)) {
      const recipientId = getSettlementRecipientId(expense);
      if (
        !recipientId ||
        getSettlementStatus(expense) !== "confirmed" ||
        !participantIds.has(expense.user_id) ||
        !participantIds.has(recipientId)
      ) {
        continue;
      }

      addObligation(expense.user_id, recipientId, amountInUnits);
      continue;
    }

    if (!participantIds.has(expense.user_id)) continue;

    const explicitShares = getExplicitExpenseShares(expense).filter(
      (share) => share.user_id !== expense.user_id && participantIds.has(share.user_id),
    );
    if (explicitShares.length > 0) {
      for (const share of explicitShares) {
        addObligation(expense.user_id, share.user_id, Math.round(Number(share.amount) * factor));
      }
      continue;
    }

    const participants = [...new Set(expense.split_among)].filter((id) => participantIds.has(id));
    if (participants.length === 0) continue;

    const shares = getEqualExpenseParticipantShares(amount, participants, expense.user_id, mode);
    for (const share of shares) {
      if (share.userId === expense.user_id) continue;
      addObligation(expense.user_id, share.userId, Math.round(share.amount * factor));
    }
  }

  const relationalTransactions = transactionsFromMatrix(matrix, factor);
  const balances = balancesFromTransactions(relationalTransactions, users);

  return { balances, relationalTransactions };
}

function createDebtMatrix(users: User[]) {
  const matrix: Record<string, Record<string, number>> = {};

  users.forEach((user) => {
    matrix[user.id] = {};
    users.forEach((otherUser) => {
      matrix[user.id]![otherUser.id] = 0;
    });
  });

  return matrix;
}

function transactionsFromMatrix(matrix: Record<string, Record<string, number>>, factor: number) {
  const transactions: Transaction[] = [];

  for (const creditorId of Object.keys(matrix)) {
    for (const debtorId of Object.keys(matrix[creditorId]!)) {
      const amount = matrix[creditorId]![debtorId] ?? 0;
      if (amount >= 1) {
        transactions.push({ from: debtorId, to: creditorId, amount: amount / factor });
      }
    }
  }

  return transactions;
}

function balancesFromTransactions(transactions: Transaction[], users: User[]) {
  const balances: Record<string, number> = Object.fromEntries(users.map((user) => [user.id, 0]));

  for (const transaction of transactions) {
    balances[transaction.from] = roundMoney((balances[transaction.from] ?? 0) - transaction.amount);
    balances[transaction.to] = roundMoney((balances[transaction.to] ?? 0) + transaction.amount);
  }

  return balances;
}

function optimizeTransactions(relationalTransactions: Transaction[]) {
  const balancesInCents: Record<string, number> = {};
  for (const transaction of relationalTransactions) {
    const amountInCents = Math.round(transaction.amount * 100);
    balancesInCents[transaction.from] = (balancesInCents[transaction.from] ?? 0) - amountInCents;
    balancesInCents[transaction.to] = (balancesInCents[transaction.to] ?? 0) + amountInCents;
  }

  return settleGlobalBalances(balancesInCents, 100);
}

function settleGlobalBalances(balances: Record<string, number>, factor: number) {
  const debtors = Object.entries(balances)
    .filter(([, balance]) => balance < 0)
    .map(([id, balance]) => ({ id, remaining: -balance }))
    .sort((first, second) => second.remaining - first.remaining);
  const creditors = Object.entries(balances)
    .filter(([, balance]) => balance > 0)
    .map(([id, balance]) => ({ id, remaining: balance }))
    .sort((first, second) => second.remaining - first.remaining);

  const transactions: Transaction[] = [];
  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex]!;
    const creditor = creditors[creditorIndex]!;
    const amount = Math.min(debtor.remaining, creditor.remaining);

    if (amount > 0) {
      transactions.push({
        from: debtor.id,
        to: creditor.id,
        amount: amount / factor,
      });
    }

    debtor.remaining -= amount;
    creditor.remaining -= amount;
    if (debtor.remaining === 0) debtorIndex += 1;
    if (creditor.remaining === 0) creditorIndex += 1;
  }

  return transactions;
}

function calculateLegacyFinances(expenses: FinanceExpense[], users: User[]) {
  const balances: Record<string, number> = Object.fromEntries(users.map((user) => [user.id, 0]));
  const matrix = createDebtMatrix(users);

  for (const expense of expenses) {
    const amount = Number(expense.amount);
    if (!Number.isFinite(amount) || amount <= 0) continue;

    if (isSettlementEntry(expense)) {
      const recipientId = getSettlementRecipientId(expense);
      const payerId = expense.user_id;
      if (!recipientId || getSettlementStatus(expense) !== "confirmed") continue;

      balances[payerId] = roundMoney((balances[payerId] ?? 0) + amount);
      balances[recipientId] = roundMoney((balances[recipientId] ?? 0) - amount);

      if (matrix[recipientId] && matrix[payerId]) {
        matrix[recipientId]![payerId] = roundMoney((matrix[recipientId]![payerId] ?? 0) - amount);
        matrix[payerId]![recipientId] = roundMoney((matrix[payerId]![recipientId] ?? 0) + amount);
      }
      continue;
    }

    const payerId = expense.user_id;
    const explicitShares = getExplicitExpenseShares(expense);
    if (explicitShares.length > 0) {
      for (const share of explicitShares) {
        const participantId = share.user_id;
        const shareAmount = roundMoney(Number(share.amount));
        if (
          participantId === payerId ||
          shareAmount <= 0 ||
          !matrix[payerId] ||
          !matrix[participantId]
        ) {
          continue;
        }

        balances[payerId] = roundMoney((balances[payerId] ?? 0) + shareAmount);
        balances[participantId] = roundMoney((balances[participantId] ?? 0) - shareAmount);
        matrix[payerId]![participantId] = roundMoney(
          (matrix[payerId]![participantId] ?? 0) + shareAmount,
        );
        matrix[participantId]![payerId] = roundMoney(
          (matrix[participantId]![payerId] ?? 0) - shareAmount,
        );
      }
      continue;
    }

    const participants = expense.split_among.filter(Boolean);
    if (participants.length === 0) continue;

    const share = amount / participants.length;
    balances[payerId] = roundMoney((balances[payerId] ?? 0) + amount);

    for (const participantId of participants) {
      balances[participantId] = roundMoney((balances[participantId] ?? 0) - share);

      if (participantId !== payerId && matrix[payerId] && matrix[participantId]) {
        matrix[payerId]![participantId] = roundMoney(
          (matrix[payerId]![participantId] ?? 0) + share,
        );
        matrix[participantId]![payerId] = roundMoney(
          (matrix[participantId]![payerId] ?? 0) - share,
        );
      }
    }
  }

  const relationalTransactions: Transaction[] = [];
  for (const creditorId of Object.keys(matrix)) {
    for (const debtorId of Object.keys(matrix[creditorId]!)) {
      const amount = matrix[creditorId]![debtorId] ?? 0;
      if (amount >= 0.01) {
        relationalTransactions.push({
          from: debtorId,
          to: creditorId,
          amount: roundMoney(amount),
        });
      }
    }
  }

  const roundedBalances = Object.fromEntries(
    Object.entries(balances).map(([id, balance]) => [id, roundMoney(balance)]),
  );

  return { balances: roundedBalances, relationalTransactions };
}
