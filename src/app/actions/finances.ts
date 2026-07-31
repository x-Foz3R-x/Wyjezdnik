"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { closedTripMutationError, getTripActionContext } from "~/lib/server/trip-action-context";
import {
  calculateFinances,
  getSettlementRecipientId,
  getSettlementStatus,
  parseFinanceMode,
  parseSettlementStrategy,
  type FinanceExpense,
  type FinanceMode,
  type SettlementStrategy,
} from "~/lib/finances";

const tripKeySchema = z.string().regex(/^[0-9a-f]{12}$/);
const moneySchema = z.number().finite().positive().max(1_000_000);
const currencySchema = z.enum(["PLN", "EUR", "USD", "GBP", "CHF", "CZK", "HUF"]);
const createExpenseSchema = z.object({
  tripKey: tripKeySchema,
  payerId: z.string().uuid(),
  amount: moneySchema,
  currency: currencySchema,
  description: z.string().trim().min(1).max(240),
  splitAmong: z.array(z.string().uuid()).min(2).max(100),
  shares: z
    .array(
      z.object({
        userId: z.string().uuid(),
        amount: moneySchema,
      }),
    )
    .max(100)
    .default([]),
});
const reportSettlementSchema = z.object({
  tripKey: tripKeySchema,
  recipientId: z.string().uuid(),
  amount: moneySchema,
  currency: currencySchema,
});
const decideSettlementSchema = z.object({
  tripKey: tripKeySchema,
  settlementId: z.string().uuid(),
  status: z.enum(["confirmed", "rejected"]),
});
const updateExpenseSchema = createExpenseSchema.extend({
  expenseId: z.string().uuid(),
});
const deleteExpenseSchema = z.object({
  tripKey: tripKeySchema,
  expenseId: z.string().uuid(),
});

export type FinanceActionResult = { ok: true } | { ok: false; error: string };

function revalidateFinances(tripKey: string) {
  revalidatePath(`/t/${tripKey}/finances`);
  revalidatePath(`/t/${tripKey}`);
}

async function allUsersBelongToTrip(
  context: NonNullable<Awaited<ReturnType<typeof getTripActionContext>>>,
  userIds: string[],
) {
  const uniqueIds = [...new Set(userIds)];
  const { data, error } = await context.supabase
    .from("users")
    .select("id")
    .eq("trip_id", context.session.tripId)
    .in("id", uniqueIds);

  return !error && data?.length === uniqueIds.length;
}

async function getTripFinanceConfig(
  context: NonNullable<Awaited<ReturnType<typeof getTripActionContext>>>,
): Promise<{ mode: FinanceMode; strategy: SettlementStrategy }> {
  const { data, error } = await context.supabase
    .from("trips")
    .select("finance_mode, settlement_strategy")
    .eq("id", context.session.tripId)
    .maybeSingle();

  if (error) {
    console.error("Błąd odczytu trybu rozliczeń:", error);
    return {
      mode: "legacy" satisfies FinanceMode,
      strategy: "relational",
    };
  }

  return {
    mode: parseFinanceMode(data?.finance_mode),
    strategy: parseSettlementStrategy(data?.settlement_strategy),
  };
}

function normalizeAmount(value: number) {
  return Math.round(value * 100) / 100;
}

function normalizeShare(value: number, mode: FinanceMode) {
  if (mode === "whole") return Number.isInteger(value) ? value : null;
  return normalizeAmount(value);
}

export async function createExpenseAction(input: {
  tripKey: string;
  payerId: string;
  amount: number;
  currency: string;
  description: string;
  splitAmong: string[];
  shares?: Array<{ userId: string; amount: number }>;
}): Promise<FinanceActionResult> {
  const parsed = createExpenseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Sprawdź opis, kwotę i podział kosztu." };

  const context = await getTripActionContext(parsed.data.tripKey);
  if (!context) return { ok: false, error: "Sesja wygasła. Wejdź ponownie do wyjazdu." };
  const closedError = closedTripMutationError(context);
  if (closedError) return closedError;

  const splitAmong = [...new Set(parsed.data.splitAmong)];
  if (!splitAmong.includes(parsed.data.payerId)) splitAmong.push(parsed.data.payerId);
  const shareUserIds = parsed.data.shares.map((share) => share.userId);
  if (
    !(await allUsersBelongToTrip(context, [parsed.data.payerId, ...splitAmong, ...shareUserIds]))
  ) {
    return { ok: false, error: "Co najmniej jedna osoba nie należy do tego wyjazdu." };
  }
  const { mode: financeMode } = await getTripFinanceConfig(context);
  const amount = normalizeAmount(parsed.data.amount);

  const uniqueShares = new Map<string, number>();
  for (const share of parsed.data.shares) {
    if (share.userId === parsed.data.payerId || !splitAmong.includes(share.userId)) {
      return { ok: false, error: "Nieprawidłowa osoba w ręcznym podziale." };
    }
    const normalizedShare = normalizeShare(share.amount, financeMode);
    if (normalizedShare === null) {
      return { ok: false, error: "Ręczny podział musi używać pełnych jednostek waluty." };
    }
    uniqueShares.set(share.userId, (uniqueShares.get(share.userId) ?? 0) + normalizedShare);
  }
  const shares = [...uniqueShares].map(([userId, shareAmount]) => ({
    user_id: userId,
    amount: shareAmount,
  }));
  const sharesTotal =
    financeMode === "whole"
      ? shares.reduce((sum, share) => sum + share.amount, 0)
      : Math.round(shares.reduce((sum, share) => sum + share.amount, 0) * 100) / 100;
  if (sharesTotal > amount) {
    return { ok: false, error: "Suma kwot do oddania przekracza wartość wydatku." };
  }

  const { error } = await context.supabase.rpc("create_expense_entry", {
    p_trip_id: context.session.tripId,
    p_payer_id: parsed.data.payerId,
    p_created_by: context.participant.id,
    p_amount: amount,
    p_currency: parsed.data.currency,
    p_description: parsed.data.description,
    p_split_among: splitAmong,
    p_shares: shares,
  });

  if (error) {
    console.error("Błąd dodawania wydatku:", error);
    return { ok: false, error: "Nie udało się zapisać wydatku." };
  }

  revalidateFinances(parsed.data.tripKey);
  return { ok: true };
}

export async function reportSettlementAction(input: {
  tripKey: string;
  recipientId: string;
  amount: number;
  currency: string;
}): Promise<FinanceActionResult> {
  const parsed = reportSettlementSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Nieprawidłowa kwota lub odbiorca." };

  const context = await getTripActionContext(parsed.data.tripKey);
  if (!context) return { ok: false, error: "Sesja wygasła. Wejdź ponownie do wyjazdu." };
  if (parsed.data.recipientId === context.participant.id) {
    return { ok: false, error: "Nie można zgłosić przelewu do samego siebie." };
  }
  if (!(await allUsersBelongToTrip(context, [parsed.data.recipientId]))) {
    return { ok: false, error: "Odbiorca nie należy do tego wyjazdu." };
  }
  const { mode: financeMode, strategy } = await getTripFinanceConfig(context);
  const normalizedAmount = normalizeShare(parsed.data.amount, financeMode);
  if (normalizedAmount === null) {
    return { ok: false, error: "W tym wyjeździe przelewy zgłaszamy w pełnych jednostkach." };
  }

  const [usersResult, expensesResult] = await Promise.all([
    context.supabase.from("users").select("id, name").eq("trip_id", context.session.tripId),
    context.supabase
      .from("expenses")
      .select("*, expense_shares(user_id, amount)")
      .eq("trip_id", context.session.tripId)
      .eq("currency", parsed.data.currency)
      .is("deleted_at", null),
  ]);
  if (usersResult.error || expensesResult.error) {
    return { ok: false, error: "Nie udało się sprawdzić aktualnego rozliczenia." };
  }
  const expenses = (expensesResult.data ?? []) as FinanceExpense[];
  const finances = calculateFinances(expenses, usersResult.data ?? [], financeMode, strategy);
  const debt =
    finances.transactions.find(
      (transaction) =>
        transaction.from === context.participant.id && transaction.to === parsed.data.recipientId,
    )?.amount ?? 0;
  const pendingAmount = expenses
    .filter(
      (expense) =>
        getSettlementStatus(expense) === "pending" &&
        expense.user_id === context.participant.id &&
        getSettlementRecipientId(expense) === parsed.data.recipientId,
    )
    .reduce((sum, expense) => sum + Number(expense.amount), 0);
  if (normalizedAmount > debt - pendingAmount + 0.001) {
    return { ok: false, error: "Ta kwota przekracza pozostałą należność." };
  }

  const { error } = await context.supabase.from("expenses").insert({
    trip_id: context.session.tripId,
    user_id: context.participant.id,
    amount: normalizedAmount,
    currency: parsed.data.currency,
    description: "Zgłoszona wpłata",
    split_among: [parsed.data.recipientId],
    entry_type: "settlement",
    settlement_status: "pending",
    settlement_recipient_id: parsed.data.recipientId,
    settlement_confirmed_at: null,
    settlement_confirmed_by: null,
  });

  if (error) return { ok: false, error: "Nie udało się zgłosić wpłaty." };
  revalidateFinances(parsed.data.tripKey);
  return { ok: true };
}

export async function decideSettlementAction(input: {
  tripKey: string;
  settlementId: string;
  status: "confirmed" | "rejected";
}): Promise<FinanceActionResult> {
  const parsed = decideSettlementSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Nieprawidłowa decyzja." };

  const context = await getTripActionContext(parsed.data.tripKey);
  if (!context) return { ok: false, error: "Sesja wygasła. Wejdź ponownie do wyjazdu." };
  const { data: settlement, error: loadError } = await context.supabase
    .from("expenses")
    .select("id, entry_type, settlement_status, settlement_recipient_id")
    .eq("id", parsed.data.settlementId)
    .eq("trip_id", context.session.tripId)
    .maybeSingle();

  if (loadError || !settlement || settlement.entry_type !== "settlement") {
    return { ok: false, error: "Nie znaleziono zgłoszonej wpłaty." };
  }
  if (
    settlement.settlement_recipient_id !== context.participant.id &&
    !context.participant.is_admin
  ) {
    return { ok: false, error: "Tylko odbiorca lub Zarządca może podjąć decyzję." };
  }
  if (settlement.settlement_status !== "pending") {
    return { ok: false, error: "Ta wpłata została już rozpatrzona." };
  }

  const update =
    parsed.data.status === "confirmed"
      ? {
          settlement_status: "confirmed",
          settlement_confirmed_at: new Date().toISOString(),
          settlement_confirmed_by: context.participant.id,
          updated_at: new Date().toISOString(),
        }
      : {
          settlement_status: "rejected",
          settlement_confirmed_at: null,
          settlement_confirmed_by: null,
          updated_at: new Date().toISOString(),
        };

  const { error } = await context.supabase
    .from("expenses")
    .update(update)
    .eq("id", settlement.id)
    .eq("trip_id", context.session.tripId)
    .eq("settlement_status", "pending");

  if (error) return { ok: false, error: "Nie udało się zapisać decyzji." };
  revalidateFinances(parsed.data.tripKey);
  return { ok: true };
}

export async function updateExpenseAction(input: {
  tripKey: string;
  expenseId: string;
  payerId: string;
  amount: number;
  currency: string;
  description: string;
  splitAmong: string[];
  shares?: Array<{ userId: string; amount: number }>;
}): Promise<FinanceActionResult> {
  const parsed = updateExpenseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Sprawdź opis, kwotę i podział kosztu." };

  const context = await getTripActionContext(parsed.data.tripKey);
  if (!context) return { ok: false, error: "Sesja wygasła. Wejdź ponownie do wyjazdu." };
  if (!context.participant.is_admin) {
    return { ok: false, error: "Tylko Zarządca może poprawiać zapisane wydatki." };
  }
  const closedError = closedTripMutationError(context);
  if (closedError) return closedError;

  const splitAmong = [...new Set(parsed.data.splitAmong)];
  if (!splitAmong.includes(parsed.data.payerId)) splitAmong.push(parsed.data.payerId);
  const shareUserIds = parsed.data.shares.map((share) => share.userId);
  if (
    !(await allUsersBelongToTrip(context, [parsed.data.payerId, ...splitAmong, ...shareUserIds]))
  ) {
    return { ok: false, error: "Co najmniej jedna osoba nie należy do tego wyjazdu." };
  }

  const { mode: financeMode } = await getTripFinanceConfig(context);
  const amount = normalizeAmount(parsed.data.amount);

  const uniqueShares = new Map<string, number>();
  for (const share of parsed.data.shares) {
    if (share.userId === parsed.data.payerId || !splitAmong.includes(share.userId)) {
      return { ok: false, error: "Nieprawidłowa osoba w ręcznym podziale." };
    }
    const normalizedShare = normalizeShare(share.amount, financeMode);
    if (normalizedShare === null) {
      return { ok: false, error: "Ręczny podział musi używać pełnych jednostek waluty." };
    }
    uniqueShares.set(share.userId, (uniqueShares.get(share.userId) ?? 0) + normalizedShare);
  }

  const shares = [...uniqueShares].map(([userId, shareAmount]) => ({
    user_id: userId,
    amount: shareAmount,
  }));
  const sharesTotal =
    financeMode === "whole"
      ? shares.reduce((sum, share) => sum + share.amount, 0)
      : Math.round(shares.reduce((sum, share) => sum + share.amount, 0) * 100) / 100;
  if (sharesTotal > amount) {
    return { ok: false, error: "Suma kwot do oddania przekracza wartość wydatku." };
  }

  const { error } = await context.supabase.rpc("update_expense_entry", {
    p_trip_id: context.session.tripId,
    p_expense_id: parsed.data.expenseId,
    p_changed_by: context.participant.id,
    p_payer_id: parsed.data.payerId,
    p_amount: amount,
    p_currency: parsed.data.currency,
    p_description: parsed.data.description,
    p_split_among: splitAmong,
    p_shares: shares,
  });

  if (error) {
    console.error("Błąd poprawiania wydatku:", error);
    return { ok: false, error: "Nie udało się poprawić wydatku." };
  }

  revalidateFinances(parsed.data.tripKey);
  return { ok: true };
}

export async function deleteExpenseAction(input: {
  tripKey: string;
  expenseId: string;
}): Promise<FinanceActionResult> {
  const parsed = deleteExpenseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Nieprawidłowy wydatek." };

  const context = await getTripActionContext(parsed.data.tripKey);
  if (!context) return { ok: false, error: "Sesja wygasła. Wejdź ponownie do wyjazdu." };
  if (!context.participant.is_admin) {
    return { ok: false, error: "Tylko Zarządca może usuwać zapisane wydatki." };
  }
  const closedError = closedTripMutationError(context);
  if (closedError) return closedError;

  const { error } = await context.supabase.rpc("soft_delete_expense_entry", {
    p_trip_id: context.session.tripId,
    p_expense_id: parsed.data.expenseId,
    p_changed_by: context.participant.id,
  });

  if (error) {
    console.error("Błąd usuwania wydatku:", error);
    return { ok: false, error: "Nie udało się usunąć wydatku." };
  }

  revalidateFinances(parsed.data.tripKey);
  return { ok: true };
}
