import { useState } from "react";
import {
  CalendarIcon,
  ChevronDown,
  CircleDollarSign,
  MapPin,
  SlidersHorizontal,
} from "lucide-react";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { DateRangePicker } from "~/components/ui/date-range-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { CURRENCIES, type CurrencyCode } from "~/lib/currencies";
import type { TripFormData } from "./index";

interface Props {
  data: TripFormData;
  setData: React.Dispatch<React.SetStateAction<TripFormData>>;
  onNext: () => void;
  onCancel: () => void;
}

export function StepBasics({ data, setData, onNext, onCancel }: Props) {
  const isValid = data.name.trim().length >= 2;
  const hasOptionalDetails = Boolean(
    data.destinationName ||
    data.destinationAddress ||
    data.destinationMapUrl ||
    data.dateRange.from ||
    data.defaultCurrency !== "PLN",
  );
  const [isDetailsOpen, setIsDetailsOpen] = useState(hasOptionalDetails);

  return (
    <div className="animate-fade-in flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <span className="text-theme-primary text-xs font-bold tracking-widest uppercase">
          Zacznij od najważniejszego
        </span>
        <h2 className="font-heading text-theme-text text-4xl leading-tight font-semibold">
          Dokąd jedziecie?
        </h2>
        <p className="text-theme-muted text-sm">
          Nazwa wystarczy, żeby utworzyć wyjazd. Resztę możesz pominąć i uzupełnić później.
        </p>
      </div>

      <Input
        label="Nazwa wyjazdu"
        value={data.name}
        onChange={(e) => setData({ ...data, name: e.target.value })}
        placeholder="np. Majówka w Alpach"
        autoFocus
        className={{ input: "font-bold" }}
      />

      <details
        className="bg-theme-card/70 border-theme-border group overflow-hidden rounded-2xl border"
        open={isDetailsOpen}
        onToggle={(event) => setIsDetailsOpen(event.currentTarget.open)}
      >
        <summary className="flex min-h-18 cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
          <span className="bg-theme-primary/10 text-theme-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
            <SlidersHorizontal size={18} />
          </span>
          <span className="min-w-0 flex-1">
            <strong className="text-theme-text block text-sm">Ustawienia startowe</strong>
            <span className="text-theme-muted mt-0.5 block text-xs">
              Termin, miejsce i waluta · możesz uzupełnić później
            </span>
          </span>
          <ChevronDown
            className="text-theme-muted shrink-0 transition group-open:rotate-180"
            size={18}
          />
        </summary>

        <div className="border-theme-border flex flex-col gap-4 border-t p-4">
          <section className="flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <div className="bg-theme-primary/10 text-theme-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                <MapPin size={19} />
              </div>
              <div>
                <h3 className="text-theme-text font-bold">Miejsce docelowe</h3>
                <p className="text-theme-muted text-xs">Zasili kafelek z nawigacją.</p>
              </div>
            </div>
            <Input
              label="Nazwa miejsca"
              value={data.destinationName}
              onChange={(event) => setData({ ...data, destinationName: event.target.value })}
              placeholder="np. Domek nad jeziorem"
            />
            <Input
              label="Adres"
              value={data.destinationAddress}
              onChange={(event) => setData({ ...data, destinationAddress: event.target.value })}
              placeholder="Ulica, miejscowość"
            />
            <Input
              type="url"
              label="Link do mapy (opcjonalnie)"
              value={data.destinationMapUrl}
              onChange={(event) => setData({ ...data, destinationMapUrl: event.target.value })}
              placeholder="https://maps.app.goo.gl/..."
            />
          </section>

          <section className="border-theme-border flex flex-col gap-3 border-t pt-4">
            <div className="flex items-start gap-3">
              <div className="bg-theme-primary/10 text-theme-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                <CircleDollarSign size={19} />
              </div>
              <div>
                <h3 className="text-theme-text font-bold">Domyślna waluta</h3>
                <p className="text-theme-muted text-xs">
                  Będzie podpowiadana, ale każdy wydatek może mieć inną.
                </p>
              </div>
            </div>
            <Select
              value={data.defaultCurrency}
              onValueChange={(value) =>
                setData({ ...data, defaultCurrency: value as CurrencyCode })
              }
            >
              <SelectTrigger className="bg-theme-card border-theme-border h-12 w-full rounded-[var(--theme-radius-control)] px-3">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((currency) => (
                  <SelectItem key={currency.code} value={currency.code}>
                    {currency.code} · {currency.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </section>

          <section className="border-theme-border flex flex-col gap-3 border-t pt-4">
            <div className="flex items-start gap-3">
              <div className="bg-theme-accent/10 text-theme-accent flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                <CalendarIcon size={19} />
              </div>
              <div>
                <h3 className="text-theme-text font-bold">Termin</h3>
                <p className="text-theme-muted text-xs">Możesz wybrać także jeden dzień.</p>
              </div>
            </div>
            <DateRangePicker
              value={data.dateRange}
              onChange={(dateRange) => setData({ ...data, dateRange })}
            />
          </section>
        </div>
      </details>

      <div className="mt-4 flex gap-3">
        <Button
          variant="outline"
          onClick={onCancel}
          className="text-theme-muted border-theme-border flex-1 text-xs font-bold tracking-widest uppercase"
        >
          Anuluj
        </Button>
        <Button
          onClick={onNext}
          disabled={!isValid}
          className="flex-1 text-xs font-bold tracking-widest uppercase shadow-lg"
        >
          Dalej
        </Button>
      </div>
    </div>
  );
}
