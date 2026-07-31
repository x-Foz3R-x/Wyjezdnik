"use client";

import { memo } from "react";
import { ChevronDown } from "lucide-react";
import { formatFinanceAmount, type FinanceMode } from "~/lib/finances";
import type { CurrencyCode } from "~/lib/currencies";

interface ReceiptSummaryProps {
  summaries: Array<{
    currency: CurrencyCode;
    totalCost: number;
    outstandingTotal: number;
    expenseCount: number;
    averageExpense: number;
    activeUserPaid: number;
    activeUserShare: number;
    largestExpense: { description: string; amount: number } | null;
    payerBreakdown: Array<{ id: string; name: string; amount: number }>;
  }>;
  canViewAllExpenses: boolean;
  financeMode: FinanceMode;
}

export const ReceiptSummary = memo(function ReceiptSummary({
  summaries,
  canViewAllExpenses,
  financeMode,
}: ReceiptSummaryProps) {
  const expenseCount = summaries.reduce((sum, summary) => sum + summary.expenseCount, 0);

  return (
    <section className="border-receipt-ink mt-4 border-y-2 py-3">
      <p className="text-receipt-muted text-[9px] font-black tracking-[0.14em] uppercase">
        {canViewAllExpenses ? "Podsumowanie walut" : "Twoje rachunki"}
      </p>
      <dl className="divide-receipt-line mt-1 divide-y divide-dashed uppercase">
        {summaries.map((summary) => (
          <div key={summary.currency} className="py-2.5 first:pt-1">
            <div className="flex items-end justify-between gap-3">
              <dt className="text-receipt-ink text-sm font-black tracking-wider">
                Suma {summary.currency}
              </dt>
              <dd className="text-receipt-ink text-base font-black">
                {formatFinanceAmount(summary.totalCost, financeMode, {
                  currency: summary.currency,
                })}
              </dd>
            </div>
            <div className="text-receipt-muted mt-1 flex justify-between gap-3 text-[9px] font-semibold">
              <dt>Pozostało między Wami</dt>
              <dd>
                {formatFinanceAmount(summary.outstandingTotal, financeMode, {
                  currency: summary.currency,
                })}
              </dd>
            </div>
          </div>
        ))}
      </dl>

      {expenseCount > 0 && (
        <details className="group mt-3">
          <summary className="bg-receipt-ink/[0.045] text-receipt-ink flex min-h-10 cursor-pointer list-none items-center justify-between px-3 text-[10px] font-black tracking-wider uppercase [&::-webkit-details-marker]:hidden">
            Statystyki wydatków
            <ChevronDown
              size={15}
              className="text-receipt-muted transition-transform group-open:rotate-180"
            />
          </summary>

          <div className="divide-receipt-line divide-y divide-dashed pt-2">
            {summaries
              .filter((summary) => summary.expenseCount > 0)
              .map((summary) => (
                <CurrencyStatistics
                  key={summary.currency}
                  summary={summary}
                  canViewAllExpenses={canViewAllExpenses}
                  financeMode={financeMode}
                />
              ))}
          </div>
        </details>
      )}
    </section>
  );
});

function CurrencyStatistics({
  summary,
  canViewAllExpenses,
  financeMode,
}: {
  summary: ReceiptSummaryProps["summaries"][number];
  canViewAllExpenses: boolean;
  financeMode: FinanceMode;
}) {
  const personalDifference = summary.activeUserPaid - summary.activeUserShare;
  const largestPayerAmount = summary.payerBreakdown[0]?.amount ?? 0;
  const money = (amount: number) =>
    formatFinanceAmount(amount, financeMode, { currency: summary.currency });

  return (
    <div className="py-4 first:pt-2 last:pb-1">
      <p className="text-receipt-ink text-[10px] font-black tracking-wider uppercase">
        {summary.currency}
      </p>
      <div className="text-receipt-muted mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[9px] font-semibold">
        <span>{summary.expenseCount} wydatków</span>
        <span aria-hidden="true">·</span>
        <span>średnio {money(summary.averageExpense)}</span>
        {summary.largestExpense && (
          <>
            <span aria-hidden="true">·</span>
            <span className="min-w-0 truncate">
              największy: {summary.largestExpense.description}
            </span>
          </>
        )}
      </div>

      <div className="bg-receipt-ink/[0.035] mt-3 p-3">
        <p className="text-receipt-muted text-[9px] font-black tracking-wider uppercase">
          Twoje liczby
        </p>
        <dl className="mt-2 grid grid-cols-2 gap-3">
          <SummaryStat label="Wyłożyłeś" value={money(summary.activeUserPaid)} />
          <SummaryStat label="Przypada na Ciebie" value={money(summary.activeUserShare)} />
        </dl>
        <p className="text-receipt-muted mt-2 text-[9px] font-semibold">
          {personalDifference > 0
            ? `Wyłożyłeś ponad swój udział ${money(personalDifference)}.`
            : personalDifference < 0
              ? `Do Twojego udziału brakuje ${money(Math.abs(personalDifference))}.`
              : "Wyłożyłeś dokładnie tyle, ile wynosi Twój udział."}
        </p>
      </div>

      {summary.payerBreakdown.length > 0 && (
        <div className="mt-3">
          <p className="text-receipt-muted text-[9px] font-black tracking-wider uppercase">
            {canViewAllExpenses ? "Kto finansował wyjazd" : "Kto płacił za te rachunki"}
          </p>
          <div className="mt-2 space-y-2.5">
            {summary.payerBreakdown.slice(0, 4).map((payer) => (
              <div key={payer.id}>
                <div className="flex justify-between gap-3 text-[9px] font-semibold">
                  <span className="text-receipt-ink min-w-0 truncate">{payer.name}</span>
                  <span className="text-receipt-muted shrink-0">{money(payer.amount)}</span>
                </div>
                <div className="bg-receipt-line/25 mt-1 h-1.5 overflow-hidden">
                  <div
                    className="bg-receipt-ink/65 h-full"
                    style={{
                      width: `${largestPayerAmount > 0 ? Math.max(4, (payer.amount / largestPayerAmount) * 100) : 0}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-receipt-muted text-[9px] font-semibold">{label}</dt>
      <dd className="text-receipt-ink mt-0.5 truncate text-[11px] font-black">{value}</dd>
    </div>
  );
}
