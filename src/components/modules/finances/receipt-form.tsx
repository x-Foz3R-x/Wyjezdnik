"use client";

import { memo, useEffect, useMemo, useState } from "react";
import { Check, Equal, ReceiptText, UserRound, UsersRound } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import type { Database } from "~/types/database";
import { useTripRoute } from "~/providers/trip-route-provider";
import { createExpenseAction, updateExpenseAction } from "~/app/actions/finances";
import {
  formatFinanceAmount,
  getExplicitExpenseShares,
  getEqualExpenseParticipantShares,
  getFinanceModeLabel,
  type FinanceExpense,
  type FinanceMode,
} from "~/lib/finances";
import { cn } from "~/lib/utils";
import { runClientAction } from "~/lib/client-action";
import { CURRENCIES, getCurrency, parseCurrencyCode, type CurrencyCode } from "~/lib/currencies";

type User = Pick<Database["public"]["Tables"]["users"]["Row"], "id" | "name">;
type SplitMode = "equal" | "manual";

interface ExpenseFormProps {
  users: User[];
  activeUserId: string;
  onSuccess: () => void;
  expense?: FinanceExpense | null;
}

export const ExpenseForm = memo(function ExpenseForm({
  users,
  activeUserId,
  onSuccess,
  expense,
}: ExpenseFormProps) {
  const { urlKey, financeMode, defaultCurrency } = useTripRoute();
  const initialExplicitShares = expense ? getExplicitExpenseShares(expense) : [];
  const [description, setDescription] = useState(expense?.description ?? "");
  const [amountInput, setAmountInput] = useState(
    expense ? formatMoneyInput(Number(expense.amount), financeMode) : "",
  );
  const [isLoading, setIsLoading] = useState(false);
  const [currency, setCurrency] = useState<CurrencyCode>(
    expense ? parseCurrencyCode(expense.currency) : defaultCurrency,
  );
  const [payerId, setPayerId] = useState(expense?.user_id ?? activeUserId);
  const [splitMode, setSplitMode] = useState<SplitMode>(
    initialExplicitShares.length > 0 ? "manual" : "equal",
  );
  const [splitAmong, setSplitAmong] = useState<string[]>(
    expense?.split_among ?? users.map((user) => user.id),
  );
  const [manualShares, setManualShares] = useState<Record<string, string>>(
    Object.fromEntries(
      initialExplicitShares.map((share) => [
        share.user_id,
        formatMoneyInput(Number(share.amount), financeMode),
      ]),
    ),
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setSplitAmong((previous) => (previous.includes(payerId) ? previous : [...previous, payerId]));
    setManualShares((previous) => {
      if (!(payerId in previous)) return previous;
      const next = { ...previous };
      delete next[payerId];
      return next;
    });
  }, [payerId]);

  const parsedAmount = parseMoneyInput(amountInput);
  const isAmountValid = parsedAmount !== null && parsedAmount > 0;
  const equalParticipants = splitAmong.filter((id) => id !== payerId);
  const parsedManualShares = useMemo(
    () =>
      users
        .filter((user) => user.id !== payerId)
        .map((user) => ({
          userId: user.id,
          amount: parseMoneyInput(manualShares[user.id] ?? "") ?? 0,
        }))
        .filter((share) => Number.isFinite(share.amount) && share.amount > 0),
    [manualShares, payerId, users],
  );
  const manualTotal = parsedManualShares.reduce((sum, share) => sum + share.amount, 0);
  const payerPart = isAmountValid ? parsedAmount - manualTotal : 0;
  const equalShares = useMemo(
    () =>
      parsedAmount !== null && parsedAmount > 0
        ? getEqualExpenseParticipantShares(parsedAmount, splitAmong, payerId, financeMode)
        : [],
    [financeMode, parsedAmount, payerId, splitAmong],
  );
  const areManualSharesValid =
    parsedAmount !== null &&
    parsedManualShares.length > 0 &&
    manualTotal <= parsedAmount &&
    parsedManualShares.every((share) => financeMode !== "whole" || Number.isInteger(share.amount));
  const isSplitValid = splitMode === "equal" ? equalParticipants.length > 0 : areManualSharesValid;
  const isFormValid = description.trim().length > 0 && isAmountValid && isSplitValid;

  const toggleUser = (userId: string) => {
    if (userId === payerId) return;
    setSplitAmong((previous) =>
      previous.includes(userId) ? previous.filter((id) => id !== userId) : [...previous, userId],
    );
  };

  const handleSubmit = async () => {
    if (!isFormValid || isLoading) return;

    setIsLoading(true);
    setErrorMessage(null);
    const shares = splitMode === "manual" ? parsedManualShares : [];
    const participants =
      splitMode === "manual" ? [payerId, ...shares.map((share) => share.userId)] : splitAmong;

    const values = {
      tripKey: urlKey,
      payerId,
      amount: parsedAmount,
      currency,
      description: description.trim(),
      splitAmong: participants,
      shares,
    };
    const result = await runClientAction(
      () =>
        expense
          ? updateExpenseAction({ ...values, expenseId: expense.id })
          : createExpenseAction(values),
      expense ? "Nie udało się poprawić wydatku." : "Nie udało się dodać wydatku.",
    );

    setIsLoading(false);
    if (result.ok) onSuccess();
    else setErrorMessage(result.error);
  };

  return (
    <div className="pb-safe font-mono">
      <div className="border-theme-border mb-4 flex items-center justify-between border-b border-dashed pb-3">
        <span className="text-theme-text flex items-center gap-2 text-xs font-bold tracking-widest uppercase">
          <ReceiptText size={17} className="text-theme-primary" />
          {expense ? "Popraw wydatek" : "Nowy wydatek"}
        </span>
        <span className="text-theme-muted text-[10px]">{getFinanceModeLabel(financeMode)}</span>
      </div>

      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-theme-muted flex items-center gap-2 text-[10px] font-bold tracking-widest uppercase">
            <UserRound size={14} className="text-theme-primary" />
            Kto zapłacił
          </span>
          <Select value={payerId} onValueChange={setPayerId}>
            <SelectTrigger className="bg-theme-bg border-theme-border h-12 w-full rounded-[var(--theme-radius-control)] px-4">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name}
                  {user.id === activeUserId ? " (Ty)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* <span className="text-theme-muted text-[10px]">
            Możesz wpisać rachunek za osobę, która teraz nie może lub nie ma telefonu pod ręką.
          </span> */}
        </label>

        {errorMessage && (
          <p className="border-theme-danger/30 bg-theme-danger/8 text-theme-danger rounded-xl border px-3 py-2 font-sans text-xs">
            {errorMessage}
          </p>
        )}

        <Input
          label="Za co?"
          value={description}
          placeholder="np. Zakupy w Żabce"
          onChange={(event) => setDescription(event.target.value)}
          className={{
            input:
              "bg-theme-bg text-theme-text placeholder:text-theme-muted/45 focus:border-theme-primary border-theme-border font-mono",
            label: "font-mono",
          }}
        />

        <div>
          <div className="relative">
            <Input
              label="Kwota rachunku"
              type="text"
              inputMode="decimal"
              value={amountInput}
              placeholder="0,00"
              onChange={(event) =>
                setAmountInput((current) => normalizeMoneyInput(event.target.value, true, current))
              }
              className={{
                input:
                  "bg-theme-bg text-theme-text placeholder:text-theme-muted/45 focus:border-theme-primary border-theme-border pr-20 font-mono font-bold",
                label: "font-mono",
              }}
            />
            <label className="absolute top-1/2 right-2 w-[5rem] -translate-y-1/2">
              <span className="sr-only">Waluta wydatku</span>
              <Select
                value={currency}
                onValueChange={(value) => setCurrency(value as CurrencyCode)}
              >
                <SelectTrigger
                  className="text-theme-primary h-10 w-full border-0 bg-transparent px-2 text-xs font-black shadow-none focus-visible:ring-0"
                  aria-label="Waluta wydatku"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  {CURRENCIES.map((item) => (
                    <SelectItem key={item.code} value={item.code}>
                      {item.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          </div>
          {financeMode === "whole" && (
            <p className="text-theme-muted mt-1 text-[10px]">
              Rachunek może zawierać część dziesiętną. Udziały innych osób zostaną normalnie
              zaokrąglone do pełnej jednostki, a reszta zostanie po stronie płatnika.
            </p>
          )}
        </div>

        <section className="border-theme-border border-t border-dashed pt-4">
          <div className="flex items-center gap-2">
            <UsersRound size={15} className="text-theme-primary" />
            <p className="text-theme-muted text-[10px] font-bold tracking-widest uppercase">
              Jak podzielić
            </p>
          </div>

          <div className="bg-theme-bg border-theme-border mt-3 grid grid-cols-2 rounded-xl border p-1">
            <SplitModeButton
              active={splitMode === "equal"}
              icon={Equal}
              label="Po równo"
              onClick={() => setSplitMode("equal")}
            />
            <SplitModeButton
              active={splitMode === "manual"}
              icon={ReceiptText}
              label="Własne kwoty"
              onClick={() => setSplitMode("manual")}
            />
          </div>

          {splitMode === "equal" ? (
            <div className="mt-3">
              <div className="mb-2 flex min-h-10 items-center justify-between gap-3">
                <p className="text-theme-muted text-[10px]">
                  {splitAmong.length} z {users.length} osób
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setSplitAmong(users.map((user) => user.id))}
                    className="text-theme-primary min-h-10 text-[10px] font-bold uppercase"
                  >
                    Wszyscy
                  </button>
                  <button
                    type="button"
                    onClick={() => setSplitAmong([payerId])}
                    className="text-theme-muted min-h-10 text-[10px] font-bold uppercase"
                  >
                    Wyczyść
                  </button>
                </div>
              </div>
              <div
                className={cn(
                  "grid grid-cols-2 gap-2",
                  users.length > 10 && "max-h-68 overflow-y-auto pr-1",
                )}
              >
                {users.map((user) => {
                  const isPayer = user.id === payerId;
                  const isSelected = splitAmong.includes(user.id);
                  return (
                    <button
                      key={user.id}
                      type="button"
                      disabled={isPayer}
                      onClick={() => toggleUser(user.id)}
                      aria-pressed={isSelected}
                      className={cn(
                        "border-theme-border text-theme-muted flex min-h-12 min-w-0 items-center gap-2 rounded-xl border px-3 text-left text-xs font-bold transition active:scale-98",
                        isSelected && "border-theme-primary bg-theme-primary/10 text-theme-text",
                        isPayer && "cursor-default opacity-70",
                      )}
                    >
                      <span
                        className={cn(
                          "border-theme-muted/40 flex size-5 shrink-0 items-center justify-center rounded-full border",
                          isSelected &&
                            "border-theme-primary bg-theme-primary text-theme-primary-foreground",
                        )}
                      >
                        {isSelected && <Check size={12} strokeWidth={3} />}
                      </span>
                      <span className="min-w-0 truncate">
                        {user.name}
                        {isPayer && (
                          <span className="text-theme-muted block text-[8px] uppercase">
                            Płatnik
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
              {isAmountValid && splitAmong.length > 1 && (
                <div className="border-theme-border divide-theme-border mt-3 divide-y overflow-hidden rounded-xl border">
                  {equalShares.map((share) => {
                    const user = users.find((candidate) => candidate.id === share.userId);
                    const isPayer = share.userId === payerId;
                    return (
                      <div
                        key={share.userId}
                        className="flex min-h-12 items-center justify-between gap-3 px-3"
                      >
                        <span className="text-theme-text min-w-0 flex-1 truncate text-sm font-bold">
                          {user?.name ?? "Nieznany"}
                          {isPayer && (
                            <span className="text-theme-muted ml-1 text-[9px] uppercase">
                              · płatnik
                            </span>
                          )}
                        </span>
                        <span className="text-theme-primary text-sm font-black">
                          {formatFinanceAmount(share.amount, financeMode, { currency })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
              {isAmountValid && splitAmong.length > 1 && (
                <p className="text-theme-muted mt-2 text-[10px] leading-relaxed">
                  To są części rachunku przypisane każdej osobie. Płatnik odzyskuje udziały
                  pozostałych osób, a jego własna część nie tworzy długu.
                </p>
              )}
            </div>
          ) : (
            <div className="mt-3">
              <p className="text-theme-muted mb-2 text-[10px] leading-relaxed">
                Wpisz tylko kwoty, które konkretne osoby mają oddać. To, co zostanie z rachunku,
                pozostaje po stronie płatnika.
              </p>
              <div className="border-theme-border divide-theme-border divide-y overflow-hidden rounded-xl border">
                {users.map((user) => {
                  const isPayer = user.id === payerId;
                  return (
                    <label
                      key={user.id}
                      className={cn(
                        "flex min-h-13 items-center gap-3 px-3",
                        isPayer && "bg-theme-primary/6",
                      )}
                    >
                      <span className="text-theme-text min-w-0 flex-1 truncate text-sm font-bold">
                        {user.name}
                        {isPayer && (
                          <span className="text-theme-muted block text-[9px] uppercase">
                            Płatnik · kwota wynika z reszty rachunku
                          </span>
                        )}
                      </span>
                      <input
                        type="text"
                        inputMode={financeMode === "whole" ? "numeric" : "decimal"}
                        disabled={isPayer}
                        value={
                          isPayer
                            ? isAmountValid
                              ? formatMoneyInput(Math.max(0, payerPart), financeMode)
                              : ""
                            : (manualShares[user.id] ?? "")
                        }
                        placeholder="0"
                        onChange={(event) =>
                          !isPayer &&
                          setManualShares((current) => ({
                            ...current,
                            [user.id]: normalizeMoneyInput(
                              event.target.value,
                              financeMode !== "whole",
                              current[user.id] ?? "",
                            ),
                          }))
                        }
                        className="text-theme-text placeholder:text-theme-muted/40 disabled:text-theme-primary h-10 w-24 bg-transparent text-right font-mono font-bold outline-hidden"
                      />
                      <span className="text-theme-muted text-xs">
                        {getCurrency(currency).symbol}
                      </span>
                    </label>
                  );
                })}
              </div>

              {isAmountValid && (
                <div
                  className={cn(
                    "mt-3 flex items-center justify-between text-xs",
                    payerPart < 0 ? "text-theme-danger" : "text-theme-muted",
                  )}
                >
                  <span>Zostaje po stronie płatnika</span>
                  <strong>
                    {formatFinanceAmount(payerPart, financeMode, {
                      currency,
                    })}
                  </strong>
                </div>
              )}
            </div>
          )}
        </section>

        <Button
          type="button"
          variant={isFormValid ? "default" : "outline"}
          disabled={isLoading || !isFormValid}
          onClick={() => void handleSubmit()}
          className="w-full gap-2 font-mono text-xs font-bold tracking-widest uppercase"
        >
          <ReceiptText size={16} />
          {isLoading ? "Zapisywanie…" : expense ? "Zapisz poprawki" : "Dopisz do paragonu"}
        </Button>
      </div>
    </div>
  );
});

function SplitModeButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: typeof Equal;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "text-theme-muted flex min-h-10 items-center justify-center gap-2 rounded-lg text-xs font-bold",
        active && "bg-theme-card-raised text-theme-text",
      )}
    >
      <Icon size={14} />
      {label}
    </button>
  );
}

function parseMoneyInput(value: string) {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) return null;

  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : null;
}

function formatMoneyInput(value: number, mode: FinanceMode) {
  if (!Number.isFinite(value)) return "";
  if (mode === "whole") return String(value);
  return String(value).replace(".", ",");
}

function normalizeMoneyInput(value: string, allowDecimals: boolean, previous: string) {
  const compact = value.replace(/\s/g, "");

  if (!allowDecimals) {
    return compact.replace(/\D/g, "");
  }

  const localized = compact.replace(/\./g, ",");
  return /^\d*(?:,\d{0,2})?$/.test(localized) ? localized : previous;
}
