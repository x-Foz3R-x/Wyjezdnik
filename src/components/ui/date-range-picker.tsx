"use client";

import { useState } from "react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { CalendarIcon, RotateCcw } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { ResponsiveDialog } from "~/components/ui/responsive-dialog";
import { Button } from "~/components/ui/button";
import { Calendar } from "~/components/ui/calendar";
import { cn } from "~/lib/utils";

type DateRangeValue = {
  from: Date | undefined;
  to: Date | undefined;
};

export function DatePicker({
  value,
  onChange,
  placeholder = "Wybierz dzień",
}: {
  value: Date | undefined;
  onChange: (value: Date | undefined) => void;
  placeholder?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState<Date | undefined>(value);

  const handleOpenChange = (open: boolean) => {
    if (open) setDraft(value);
    setIsOpen(open);
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => handleOpenChange(true)}
        className={cn(
          "bg-theme-card border-theme-border h-13 w-full justify-start rounded-xl text-left font-bold",
          !value && "text-theme-muted/50",
        )}
      >
        <CalendarIcon className="text-theme-muted mr-3 h-5 w-5 shrink-0" />
        <span className="truncate">
          {value ? format(value, "EEEE, d MMM yyyy", { locale: pl }) : placeholder}
        </span>
      </Button>

      <ResponsiveDialog
        isOpen={isOpen}
        setIsOpen={handleOpenChange}
        title="Wybierz dzień"
        description="Termin wybierasz z tego samego kalendarza co daty całego wyjazdu."
      >
        <div className="flex flex-col gap-5">
          <div className="flex justify-center overflow-x-auto">
            <Calendar
              mode="single"
              selected={draft}
              onSelect={setDraft}
              defaultMonth={draft}
              locale={pl}
              numberOfMonths={1}
              autoFocus
            />
          </div>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDraft(undefined);
                onChange(undefined);
                setIsOpen(false);
              }}
              disabled={!value && !draft}
              className="shrink-0"
            >
              <RotateCcw size={16} />
              Wyczyść
            </Button>
            <Button
              type="button"
              disabled={!draft}
              onClick={() => {
                onChange(draft);
                setIsOpen(false);
              }}
              className="flex-1"
            >
              Zastosuj
            </Button>
          </div>
        </div>
      </ResponsiveDialog>
    </>
  );
}

export function DateRangePicker({
  value,
  onChange,
  placeholder = "Dodaj termin",
}: {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  placeholder?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState<DateRangeValue>(value);

  const handleOpenChange = (open: boolean) => {
    if (open) setDraft(value);
    setIsOpen(open);
  };

  const apply = () => {
    onChange(draft);
    setIsOpen(false);
  };

  const clear = () => {
    const emptyRange = { from: undefined, to: undefined };
    setDraft(emptyRange);
    onChange(emptyRange);
    setIsOpen(false);
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => handleOpenChange(true)}
        className={cn(
          "bg-theme-card border-theme-border h-13 w-full justify-start rounded-xl text-left font-bold",
          !value.from && "text-theme-muted/50",
        )}
      >
        <CalendarIcon className="text-theme-muted mr-3 h-5 w-5 shrink-0" />
        <span className="truncate">{formatRange(value, placeholder)}</span>
      </Button>

      <ResponsiveDialog
        isOpen={isOpen}
        setIsOpen={handleOpenChange}
        title="Wybierz termin"
        description="Wybierz jeden dzień albo cały zakres wyjazdu."
      >
        <div className="flex flex-col gap-5">
          <div className="flex justify-center overflow-x-auto">
            <Calendar
              mode="range"
              selected={draft}
              onSelect={(range: DateRange | undefined) =>
                setDraft({ from: range?.from, to: range?.to })
              }
              locale={pl}
              numberOfMonths={1}
              autoFocus
            />
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={clear}
              disabled={!value.from && !draft.from}
              className="shrink-0"
              aria-label="Wyczyść termin"
            >
              <RotateCcw size={16} />
              Wyczyść
            </Button>
            <Button type="button" onClick={apply} className="flex-1">
              Zastosuj
            </Button>
          </div>
        </div>
      </ResponsiveDialog>
    </>
  );
}

function formatRange(value: DateRangeValue, placeholder: string) {
  if (!value.from) return placeholder;
  if (!value.to) return format(value.from, "d MMM yyyy", { locale: pl });
  return `${format(value.from, "d MMM yyyy", { locale: pl })} – ${format(value.to, "d MMM yyyy", { locale: pl })}`;
}
