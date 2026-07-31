import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { CalendarDays, CircleDollarSign, MapPin, Puzzle, Users } from "lucide-react";
import { Button } from "~/components/ui/button";
import { TRIP_MODULES } from "~/lib/trip-config";
import type { TripFormData } from "./index";

export function StepReview({
  data,
  onBack,
  onSubmit,
  isSubmitting,
}: {
  data: TripFormData;
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}) {
  const enabledModules = TRIP_MODULES.filter((module) => data.modules[module.key]);
  const dateLabel = data.dateRange.from
    ? data.dateRange.to
      ? `${format(data.dateRange.from, "d MMM", { locale: pl })} – ${format(data.dateRange.to, "d MMM yyyy", { locale: pl })}`
      : format(data.dateRange.from, "d MMM yyyy", { locale: pl })
    : "Do uzupełnienia później";

  return (
    <div className="animate-fade-in flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <span className="text-theme-primary text-xs font-bold tracking-widest uppercase">
          Wszystko gotowe
        </span>
        <h2 className="font-heading text-theme-text text-4xl leading-tight font-semibold">
          Utworzyć „{data.name}”?
        </h2>
        <p className="text-theme-muted text-sm">Każdą z tych informacji zmienisz później.</p>
      </div>

      <div className="bg-theme-card border-theme-border divide-theme-border flex flex-col divide-y rounded-2xl border px-4">
        <SummaryRow icon={CalendarDays} label="Termin" value={dateLabel} />
        <SummaryRow
          icon={MapPin}
          label="Cel"
          value={data.destinationName || data.destinationAddress || "Do uzupełnienia później"}
        />
        <SummaryRow icon={CircleDollarSign} label="Waluta" value={data.defaultCurrency} />
        <SummaryRow
          icon={Users}
          label="Ekipa"
          value={`${data.members.length + 1} ${data.members.length === 0 ? "osoba" : "osób"}`}
        />
        <SummaryRow
          icon={Puzzle}
          label="Moduły"
          value={enabledModules.map((module) => module.shortName).join(", ") || "Brak"}
        />
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} disabled={isSubmitting} className="flex-1">
          Wróć
        </Button>
        <Button onClick={onSubmit} disabled={isSubmitting} className="flex-1">
          {isSubmitting ? "Tworzenie…" : "Utwórz wyjazd"}
        </Button>
      </div>
    </div>
  );
}

function SummaryRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CalendarDays;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 py-4">
      <Icon className="text-theme-primary mt-0.5 shrink-0" size={18} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-theme-muted text-[10px] font-bold tracking-wider uppercase">
          {label}
        </span>
        <span className="text-theme-text truncate text-sm font-semibold">{value}</span>
      </div>
    </div>
  );
}
