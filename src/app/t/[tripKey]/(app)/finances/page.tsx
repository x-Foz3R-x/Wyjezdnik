import { notFound, redirect } from "next/navigation";
import {
  FinancesScreen,
  type FinanceLedgerView,
} from "~/components/modules/finances/finances-screen";
import { getTripByUrlKey, parseTripModules } from "~/lib/server/trips";
import { getTripSession } from "~/lib/server/trip-session";
import { createServerSupabaseClient } from "~/lib/supabase/server";
import {
  calculateFinances,
  getExpenseParticipantShares,
  getSettlementRecipientId,
  isSettlementEntry,
  parseFinanceMode,
  parseSettlementStrategy,
  type FinanceExpense,
} from "~/lib/finances";
import { parseCurrencyCode, type CurrencyCode } from "~/lib/currencies";
import { canViewAllTripExpenses, parseExpenseVisibility } from "~/lib/expense-visibility";

export default async function FinancesPage({
  params,
  searchParams,
}: {
  params: Promise<{ tripKey: string }>;
  searchParams: Promise<{ viewAs?: string }>;
}) {
  const { tripKey } = await params;
  const { viewAs } = await searchParams;
  const session = await getTripSession(tripKey);
  if (!session?.userId) redirect(`/t/${tripKey}/join`);

  const supabase = createServerSupabaseClient();
  const [trip, usersResult, expensesResult] = await Promise.all([
    getTripByUrlKey(tripKey),
    supabase
      .from("users")
      .select("id, name, phone, revolut_url, payment_note, is_admin")
      .eq("trip_id", session.tripId)
      .order("name"),
    supabase
      .from("expenses")
      .select("*, expense_shares(user_id, amount)")
      .eq("trip_id", session.tripId)
      .order("created_at", { ascending: false }),
  ]);

  if (!trip) notFound();
  if (session.tripId !== trip.id) redirect(`/t/${tripKey}/join`);
  if (!parseTripModules(trip.modules).finances) {
    return <FinancesScreen initialExpenses={[]} initialUsers={[]} />;
  }

  if (usersResult.error) throw usersResult.error;
  if (expensesResult.error) throw expensesResult.error;

  const viewer = usersResult.data?.find((user) => user.id === session.userId);
  if (!viewer) redirect(`/t/${tripKey}/join`);
  const requestedSubject = usersResult.data?.find((user) => user.id === viewAs);
  const canPreview = Boolean(viewAs && requestedSubject && viewer.is_admin);
  const subject = canPreview && requestedSubject ? requestedSubject : viewer;
  const canViewAllExpenses = canViewAllTripExpenses({
    visibility: parseExpenseVisibility(trip.expense_visibility),
    viewerIds: trip.expense_viewer_ids ?? [],
    userId: viewer.id,
    isAdmin: viewer.is_admin,
  });
  const financeMode = parseFinanceMode(trip.finance_mode);
  const settlementStrategy = parseSettlementStrategy(trip.settlement_strategy);
  const allExpenses = (expensesResult.data ?? []).filter(
    (expense) => !expense.deleted_at,
  ) as FinanceExpense[];
  const visibleExpenses = canViewAllExpenses
    ? allExpenses
    : allExpenses.filter((expense) => {
        if (isSettlementEntry(expense)) {
          return expense.user_id === subject.id || getSettlementRecipientId(expense) === subject.id;
        }
        return (
          expense.user_id === subject.id ||
          getExpenseParticipantShares(expense, financeMode).some(
            (share) => share.userId === subject.id && share.amount > 0,
          )
        );
      });
  const currencies = new Set<CurrencyCode>();
  allExpenses.forEach((expense) => currencies.add(parseCurrencyCode(expense.currency)));
  if (currencies.size === 0) currencies.add(parseCurrencyCode(trip.default_currency));
  const initialLedgers = Object.fromEntries(
    [...currencies].map((currency) => {
      const currencyExpenses = allExpenses.filter(
        (expense) => parseCurrencyCode(expense.currency) === currency,
      );
      const calculation = calculateFinances(
        currencyExpenses,
        usersResult.data ?? [],
        financeMode,
        settlementStrategy,
      );
      const transactions = calculation.transactions;
      const ledger: FinanceLedgerView = {
        balance: calculation.balances[subject.id] ?? 0,
        debts: transactions.filter((transaction) => transaction.from === subject.id),
        receivables: transactions.filter((transaction) => transaction.to === subject.id),
        outstandingTotal: transactions.reduce((sum, transaction) => sum + transaction.amount, 0),
        relationalTransactionCount: calculation.relationalTransactions.length,
        optimizedTransactionCount: calculation.optimizedTransactions.length,
      };
      return [currency, ledger];
    }),
  ) as Partial<Record<CurrencyCode, FinanceLedgerView>>;
  const paymentRecipientIds = new Set(
    canPreview
      ? []
      : Object.values(initialLedgers).flatMap(
          (ledger) => ledger?.debts.map((transaction) => transaction.to) ?? [],
        ),
  );
  const visibleUsers = (usersResult.data ?? []).map((user) => ({
    id: user.id,
    name: user.name,
    phone: paymentRecipientIds.has(user.id) ? user.phone : null,
    revolut_url: paymentRecipientIds.has(user.id) ? user.revolut_url : null,
    payment_note: paymentRecipientIds.has(user.id) ? user.payment_note : null,
  }));

  return (
    <FinancesScreen
      initialUsers={visibleUsers}
      initialExpenses={visibleExpenses}
      initialLedgers={initialLedgers}
      canViewAllExpenses={canViewAllExpenses}
      subjectUserId={subject.id}
      previewUserName={canPreview ? requestedSubject?.name : null}
    />
  );
}
