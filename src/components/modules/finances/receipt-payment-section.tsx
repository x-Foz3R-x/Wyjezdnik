"use client";

import { memo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  HelpCircle,
} from "lucide-react";
import type { Database } from "~/types/database";
import {
  formatFinanceAmount,
  getSettlementRecipientId,
  getSettlementStatus,
  type FinanceExpense,
  type FinanceMode,
  type SettlementStatus,
  type SettlementStrategy,
  type Transaction,
} from "~/lib/finances";
import { useTripRoute } from "~/providers/trip-route-provider";
import { decideSettlementAction, reportSettlementAction } from "~/app/actions/finances";
import { ResponsiveDialog } from "~/components/responsive-dialog";
import { runClientAction } from "~/lib/client-action";
import type { CurrencyCode } from "~/lib/currencies";

type User = Pick<Database["public"]["Tables"]["users"]["Row"], "id" | "name"> & {
  phone?: string | null;
  revolut_url?: string | null;
  payment_note?: string | null;
};

interface ReceiptPaymentSectionProps {
  settlements: FinanceExpense[];
  users: User[];
  activeUserId: string;
  currency: CurrencyCode;
  balance: number;
  debts: Transaction[];
  receivables: Transaction[];
  financeMode: FinanceMode;
  settlementStrategy: SettlementStrategy;
  relationalTransactionCount: number;
  optimizedTransactionCount: number;
  onDataChanged: () => void;
  readOnly: boolean;
  showCurrencyInHeading?: boolean;
}

export const ReceiptPaymentSection = memo(function ReceiptPaymentSection({
  settlements,
  users,
  activeUserId,
  currency,
  balance,
  debts,
  receivables,
  financeMode,
  settlementStrategy,
  relationalTransactionCount,
  optimizedTransactionCount,
  onDataChanged,
  readOnly,
  showCurrencyInHeading = false,
}: ReceiptPaymentSectionProps) {
  const { urlKey } = useTripRoute();
  const [selectedDebt, setSelectedDebt] = useState<Transaction | null>(null);
  const [paymentAmountInput, setPaymentAmountInput] = useState("");
  const [isStrategyOpen, setIsStrategyOpen] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);
  const [processingKey, setProcessingKey] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [optimisticallyResolvedIds, setOptimisticallyResolvedIds] = useState<Set<string>>(
    () => new Set(),
  );

  const getUser = (userId: string) => users.find((user) => user.id === userId);
  const getUserName = (userId: string) => getUser(userId)?.name ?? "Nieznany";
  const money = (value: number, showCurrency = false) =>
    formatFinanceAmount(value, financeMode, {
      currency: showCurrency ? currency : undefined,
    });

  const pendingIncoming = settlements.filter(
    (settlement) =>
      !optimisticallyResolvedIds.has(settlement.id) &&
      getSettlementStatus(settlement) === "pending" &&
      getSettlementRecipientId(settlement) === activeUserId,
  );
  const pendingOutgoing = settlements.filter(
    (settlement) =>
      !optimisticallyResolvedIds.has(settlement.id) &&
      getSettlementStatus(settlement) === "pending" &&
      settlement.user_id === activeUserId,
  );
  const isFullySettled =
    debts.length === 0 &&
    receivables.length === 0 &&
    pendingIncoming.length === 0 &&
    pendingOutgoing.length === 0;

  const pendingAmountToRecipient = (recipientId: string) =>
    pendingOutgoing
      .filter((settlement) => getSettlementRecipientId(settlement) === recipientId)
      .reduce((sum, settlement) => sum + Number(settlement.amount), 0);
  const pendingAmountFromDebtor = (debtorId: string) =>
    pendingIncoming
      .filter((settlement) => settlement.user_id === debtorId)
      .reduce((sum, settlement) => sum + Number(settlement.amount), 0);

  const handleCopyPhone = async (phone: string) => {
    try {
      await navigator.clipboard.writeText(phone.replace(/\s/g, ""));
      setCopiedPhone(phone);
      window.setTimeout(() => setCopiedPhone(null), 1800);
    } catch {
      setActionError("Nie udało się skopiować numeru. Przytrzymaj go, aby zaznaczyć ręcznie.");
    }
  };

  const handleReportPayment = async (recipientId: string, amount: number) => {
    const processingId = `report:${recipientId}`;
    const reportedDebt = selectedDebt;
    setActionError(null);
    setProcessingKey(processingId);
    setSelectedDebt(null);
    const result = await runClientAction(
      () =>
        reportSettlementAction({
          tripKey: urlKey,
          recipientId,
          amount,
          currency,
        }),
      "Nie udało się zgłosić przelewu.",
    );
    setProcessingKey(null);

    if (!result.ok) {
      setSelectedDebt(reportedDebt);
      setActionError(result.error);
      return;
    }

    onDataChanged();
  };

  const handleSettlementDecision = async (
    settlementId: string,
    status: Extract<SettlementStatus, "confirmed" | "rejected">,
  ) => {
    const processingId = `${status}:${settlementId}`;
    setActionError(null);
    setProcessingKey(processingId);
    setOptimisticallyResolvedIds((current) => new Set(current).add(settlementId));
    const result = await runClientAction(
      () =>
        decideSettlementAction({
          tripKey: urlKey,
          settlementId,
          status,
        }),
      "Nie udało się zapisać decyzji o przelewie.",
    );
    setProcessingKey(null);

    if (!result.ok) {
      setOptimisticallyResolvedIds((current) => {
        const next = new Set(current);
        next.delete(settlementId);
        return next;
      });
      setActionError(result.error);
      return;
    }
    onDataChanged();
  };

  const selectedCreditor = selectedDebt ? getUser(selectedDebt.to) : null;
  const selectedPhone = selectedCreditor?.phone ?? null;
  const selectedRevolutUrl = selectedCreditor?.revolut_url
    ? normalizeRevolutUrl(selectedCreditor.revolut_url)
    : null;
  const selectedPendingAmount = selectedDebt ? pendingAmountToRecipient(selectedDebt.to) : 0;
  const selectedAvailableAmount = selectedDebt
    ? Math.max(0, selectedDebt.amount - selectedPendingAmount)
    : 0;
  const parsedPaymentAmount = parsePaymentAmount(paymentAmountInput);
  const isPaymentAmountValid =
    parsedPaymentAmount !== null &&
    parsedPaymentAmount > 0 &&
    parsedPaymentAmount <= selectedAvailableAmount + 0.001 &&
    (financeMode !== "whole" || Number.isInteger(parsedPaymentAmount));

  const openPaymentDialog = (debt: Transaction) => {
    const availableAmount = Math.max(0, debt.amount - pendingAmountToRecipient(debt.to));
    setActionError(null);
    setSelectedDebt(debt);
    setPaymentAmountInput(formatPaymentInput(availableAmount));
  };

  return (
    <>
      <section className="mt-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-receipt-ink text-[10px] font-black tracking-[0.14em] uppercase">
            Do rozliczenia{showCurrencyInHeading ? ` · ${currency}` : ""}
          </h2>
          {settlementStrategy === "optimized" && (
            <button
              type="button"
              onClick={() => setIsStrategyOpen(true)}
              className="text-receipt-muted hover:text-receipt-ink flex min-h-11 items-center gap-1.5 text-[10px] font-bold"
            >
              Uproszczone przelewy
              <HelpCircle size={16} />
            </button>
          )}
        </div>

        {actionError && (
          <p className="border-theme-danger/30 bg-theme-danger/8 text-theme-danger mt-2 rounded-xl border px-3 py-2 text-xs">
            {actionError}
          </p>
        )}

        {pendingIncoming.length > 0 && (
          <div className="border-receipt-line mt-3 border-y border-dashed py-3">
            <p className="text-receipt-stamp text-[10px] font-black tracking-widest uppercase">
              Potwierdź otrzymanie
            </p>
            <div className="divide-receipt-line mt-2 divide-y divide-dashed">
              {pendingIncoming.map((settlement) => {
                const isConfirming = processingKey === `confirmed:${settlement.id}`;
                const isRejecting = processingKey === `rejected:${settlement.id}`;

                return (
                  <div key={settlement.id} className="py-3 first:pt-1 last:pb-0">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-receipt-ink text-xs font-bold">
                        {getUserName(settlement.user_id)}
                      </span>
                      <span className="text-receipt-ink text-xs font-black">
                        {money(Number(settlement.amount), true)}
                      </span>
                    </div>
                    {!readOnly && (
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          disabled={isConfirming || isRejecting}
                          onClick={() => void handleSettlementDecision(settlement.id, "confirmed")}
                          className="border-receipt-ink/35 bg-receipt-ink/[0.06] text-receipt-ink min-h-11 flex-1 border px-3 text-[10px] font-black uppercase disabled:opacity-40"
                        >
                          {isConfirming ? "Zapisywanie…" : "Potwierdź"}
                        </button>
                        <button
                          type="button"
                          disabled={isConfirming || isRejecting}
                          onClick={() => void handleSettlementDecision(settlement.id, "rejected")}
                          className="border-receipt-line text-receipt-muted min-h-11 border px-3 text-[10px] font-bold uppercase disabled:opacity-40"
                        >
                          {isRejecting ? "Zapisywanie…" : "Nie dotarł"}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {isFullySettled ? (
          <div className="text-receipt-ink border-receipt-line mt-3 flex min-h-14 items-center justify-between border-y border-dashed">
            <span className="text-xs font-bold">Wszystko rozliczone</span>
            <Check size={18} />
          </div>
        ) : (
          <div className="mt-3 space-y-5">
            {debts.length > 0 && (
              <div>
                <p className="text-receipt-muted text-[10px] font-black tracking-widest uppercase">
                  Musisz oddać
                </p>
                <div className="divide-receipt-line mt-1 divide-y divide-dashed">
                  {debts.map((debt) => {
                    const creditor = getUser(debt.to);
                    const pendingAmount = pendingAmountToRecipient(debt.to);
                    const availableAmount = Math.max(0, debt.amount - pendingAmount);

                    return (
                      <div key={debt.to} className="py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-receipt-ink flex min-w-0 items-center gap-2 text-xs font-black">
                              <ArrowUpRight size={16} className="text-receipt-stamp shrink-0" />
                              {creditor?.name ?? "Nieznany"}
                            </p>
                            {pendingAmount > 0 && (
                              <p className="text-receipt-muted mt-1 ml-6 text-[9px] font-bold">
                                {money(pendingAmount, true)} czeka na potwierdzenie
                              </p>
                            )}
                          </div>
                          <div className="flex shrink-0 items-center gap-3">
                            <span className="text-receipt-stamp text-sm font-black">
                              {money(debt.amount, true)}
                            </span>
                            {!readOnly && availableAmount > 0 && (
                              <button
                                type="button"
                                onClick={() => openPaymentDialog(debt)}
                                className="border-receipt-ink text-receipt-ink min-h-10 border-b border-dotted px-1 text-[10px] font-black uppercase"
                              >
                                {pendingAmount > 0 ? "Dodaj" : "Oddaj"}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {receivables.length > 0 && (
              <div>
                <p className="text-receipt-muted text-[10px] font-black tracking-widest uppercase">
                  Czekasz na zwrot
                </p>
                <div className="divide-receipt-line mt-1 divide-y divide-dashed">
                  {receivables.map((receivable) => {
                    const pendingAmount = pendingAmountFromDebtor(receivable.from);
                    return (
                      <div
                        key={receivable.from}
                        className="flex items-center justify-between gap-3 py-3"
                      >
                        <div className="min-w-0">
                          <p className="text-receipt-ink flex items-center gap-2 text-xs font-black">
                            <ArrowDownLeft size={16} className="text-receipt-ink shrink-0" />
                            {getUserName(receivable.from)}
                          </p>
                          {pendingAmount > 0 && (
                            <p className="text-receipt-stamp mt-1 ml-6 text-[10px] font-semibold">
                              {money(pendingAmount, true)} czeka na potwierdzenie
                            </p>
                          )}
                        </div>
                        <span className="text-receipt-ink shrink-0 text-sm font-black">
                          {money(receivable.amount, true)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {settlements.length > 0 && (
          <details className="border-receipt-line mt-4 border-t border-dashed pt-2">
            <summary className="text-receipt-muted flex min-h-11 cursor-pointer list-none items-center justify-between text-xs font-bold">
              Historia przelewów ({settlements.length})
              <ChevronDown size={16} />
            </summary>
            <div className="divide-receipt-line divide-y divide-dashed">
              {settlements.map((settlement) => {
                const status = getSettlementStatus(settlement);
                const statusLabel =
                  status === "confirmed"
                    ? "potwierdzono"
                    : status === "pending"
                      ? "oczekuje"
                      : "odrzucono";
                return (
                  <div
                    key={settlement.id}
                    className="flex items-center justify-between gap-3 py-2 text-xs"
                  >
                    <span className="text-receipt-muted min-w-0 truncate font-semibold">
                      {getUserName(settlement.user_id)} →{" "}
                      {getUserName(getSettlementRecipientId(settlement) ?? "")}
                    </span>
                    <span className="text-receipt-ink shrink-0 font-bold">
                      {money(Number(settlement.amount))} · {statusLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          </details>
        )}

        <div className="border-receipt-ink mt-5 flex items-center justify-between gap-3 border-y-2 py-4">
          <span className="text-receipt-ink text-xs font-black tracking-widest uppercase">
            Twój bilans
          </span>
          <span
            className={
              balance < 0
                ? "text-receipt-stamp text-base font-black"
                : "text-receipt-ink text-base font-black"
            }
          >
            {formatFinanceAmount(balance, financeMode, {
              currency,
              sign: true,
            })}
          </span>
        </div>
      </section>

      <ResponsiveDialog
        isOpen={selectedDebt !== null}
        setIsOpen={(isOpen) => {
          if (!isOpen) setSelectedDebt(null);
        }}
        title="Przelew"
      >
        {selectedDebt && (
          <div className="space-y-5">
            {actionError && (
              <p className="border-theme-danger/30 bg-theme-danger/8 text-theme-danger rounded-xl border px-3 py-2 text-xs">
                {actionError}
              </p>
            )}
            <div className="border-theme-border bg-theme-card rounded-2xl border p-5 text-center">
              <label className="text-theme-muted text-xs font-bold tracking-widest uppercase">
                Ile oddajesz
              </label>
              <div className="mt-2 flex items-center justify-center gap-2">
                <input
                  type="text"
                  inputMode={financeMode === "whole" ? "numeric" : "decimal"}
                  value={paymentAmountInput}
                  onChange={(event) =>
                    setPaymentAmountInput((current) =>
                      normalizePaymentInput(event.target.value, financeMode, current),
                    )
                  }
                  className="text-theme-primary w-36 bg-transparent text-right text-3xl font-black outline-hidden"
                  aria-label="Kwota oddawanych pieniędzy"
                />
                <span className="text-theme-primary text-lg font-black">{currency}</span>
              </div>
              <p className="text-theme-text mt-2 text-base font-bold">{selectedCreditor?.name}</p>
              <p className="text-theme-muted mt-1 text-xs">
                Pozostało do zgłoszenia: {money(selectedAvailableAmount, true)}
              </p>
            </div>

            {selectedPhone && (
              <button
                type="button"
                onClick={() => void handleCopyPhone(selectedPhone)}
                className="border-theme-border bg-theme-card flex min-h-14 w-full items-center justify-between gap-4 rounded-2xl border px-4"
              >
                <span className="text-left">
                  <span className="text-theme-muted block text-xs">Telefon / BLIK</span>
                  <span className="text-theme-text block text-lg font-bold tracking-wider">
                    {selectedPhone}
                  </span>
                </span>
                {copiedPhone === selectedPhone ? (
                  <Check className="text-theme-success shrink-0" size={20} />
                ) : (
                  <Copy className="text-theme-primary shrink-0" size={20} />
                )}
              </button>
            )}

            {selectedRevolutUrl && (
              <a
                href={selectedRevolutUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="border-theme-border bg-theme-card flex min-h-14 w-full items-center justify-between gap-4 rounded-2xl border px-4"
              >
                <span className="text-left">
                  <span className="text-theme-muted block text-xs">Revolut</span>
                  <span className="text-theme-text block text-sm font-bold">
                    {selectedCreditor?.revolut_url}
                  </span>
                </span>
                <ExternalLink className="text-theme-primary shrink-0" size={20} />
              </a>
            )}

            {selectedCreditor?.payment_note && (
              <div className="border-theme-border bg-theme-card rounded-2xl border px-4 py-3">
                <p className="text-theme-muted text-xs">Inny sposób zwrotu</p>
                <p className="text-theme-text mt-1 text-sm font-semibold whitespace-pre-wrap">
                  {selectedCreditor.payment_note}
                </p>
              </div>
            )}

            {!selectedPhone && !selectedRevolutUrl && !selectedCreditor?.payment_note && (
              <p className="border-theme-border text-theme-muted rounded-2xl border border-dashed px-4 py-3 text-xs">
                Ta osoba nie podała jeszcze danych do przelewu. Może je uzupełnić w swoim profilu.
              </p>
            )}

            <button
              type="button"
              disabled={processingKey === `report:${selectedDebt.to}` || !isPaymentAmountValid}
              onClick={() =>
                parsedPaymentAmount !== null &&
                void handleReportPayment(selectedDebt.to, parsedPaymentAmount)
              }
              className="bg-theme-primary text-theme-primary-foreground min-h-13 w-full rounded-2xl px-4 text-sm font-black disabled:opacity-40"
            >
              {processingKey === `report:${selectedDebt.to}`
                ? "Zapisywanie…"
                : "Przelew został wysłany"}
            </button>
          </div>
        )}
      </ResponsiveDialog>

      <ResponsiveDialog
        isOpen={settlementStrategy === "optimized" && isStrategyOpen}
        setIsOpen={setIsStrategyOpen}
        title="Uproszczone przelewy"
        description="Łączymy wzajemne długi, aby grupa wykonała mniej przelewów."
      >
        <div className="space-y-4">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <StrategyCount label="Normalnie" count={relationalTransactionCount} />
            <span className="text-theme-muted text-lg">→</span>
            <StrategyCount label="Po skróceniu" count={optimizedTransactionCount} highlighted />
          </div>
          <div className="border-theme-border bg-theme-card rounded-2xl border p-4">
            <p className="text-theme-muted text-[10px] font-bold tracking-wider uppercase">
              Prosty przykład
            </p>
            <p className="text-theme-text mt-2 text-sm font-bold">Osoba A → Osoba B → Osoba C</p>
            <p className="text-theme-primary mt-2 text-sm font-black">Osoba A → Osoba C</p>
          </div>
          <p className="text-theme-muted text-xs leading-relaxed">
            Końcowy bilans każdej osoby pozostaje taki sam. Zmienia się wyłącznie droga pieniędzy.
          </p>
        </div>
      </ResponsiveDialog>
    </>
  );
});

function StrategyCount({
  label,
  count,
  highlighted = false,
}: {
  label: string;
  count: number;
  highlighted?: boolean;
}) {
  return (
    <div
      className={
        highlighted
          ? "border-theme-primary/45 bg-theme-primary/8 rounded-2xl border p-4 text-center"
          : "border-theme-border rounded-2xl border p-4 text-center"
      }
    >
      <span className="text-theme-muted block text-[10px] font-bold uppercase">{label}</span>
      <strong className={highlighted ? "text-theme-primary text-2xl" : "text-theme-text text-2xl"}>
        {count}
      </strong>
      <span className="text-theme-muted block text-[10px]">przelewów</span>
    </div>
  );
}

function parsePaymentAmount(value: string) {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) return null;
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : null;
}

function formatPaymentInput(value: number) {
  return String(Math.round(value * 100) / 100).replace(".", ",");
}

function normalizePaymentInput(value: string, mode: FinanceMode, previous: string) {
  const compact = value.replace(/\s/g, "");
  if (mode === "whole") return compact.replace(/\D/g, "");
  const localized = compact.replace(/\./g, ",");
  return /^\d*(?:,\d{0,2})?$/.test(localized) ? localized : previous;
}

function normalizeRevolutUrl(value: string) {
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^(?:www\.)?revolut\.me\//i.test(trimmed)) return `https://${trimmed}`;
  return `https://revolut.me/${trimmed.replace(/^@/, "")}`;
}
