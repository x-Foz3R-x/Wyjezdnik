"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { pl } from "date-fns/locale";
import {
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Clock3,
  MapPin,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { deleteScheduleItemAction, saveScheduleItemAction } from "~/app/actions/schedule";
import { DatePicker } from "~/components/ui/date-range-picker";
import { ResponsiveDialog } from "~/components/ui/responsive-dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import type { Database } from "~/types/database";
import { useTripRoute } from "~/providers/trip-route-provider";
import { runClientAction } from "~/lib/client-action";

type ScheduleItem = Database["public"]["Tables"]["schedule_items"]["Row"];

export function ScheduleScreen({
  tripKey,
  isAdmin,
  items,
  databaseReady,
  tripStartDate,
}: {
  tripKey: string;
  isAdmin: boolean;
  items: ScheduleItem[];
  databaseReady: boolean;
  tripStartDate: string | null;
}) {
  const { isClosed } = useTripRoute();
  const canManage = isAdmin && !isClosed;
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [activeItem, setActiveItem] = useState<ScheduleItem | null>(null);
  const [localItems, setLocalItems] = useState(items);
  const [actionError, setActionError] = useState<string | null>(null);
  const groups = useMemo(() => groupItems(localItems), [localItems]);

  useEffect(() => {
    setLocalItems(items);
  }, [items]);

  const openEditor = (item: ScheduleItem | null) => {
    setActionError(null);
    setActiveItem(item);
    setIsEditorOpen(true);
  };

  return (
    <div className="animate-fade-in pb-safe flex flex-col gap-6 pt-3">
      <header className="px-1 pt-1">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-theme-primary text-[10px] font-bold tracking-[0.18em] uppercase">
              Karta podróży · {localItems.length} {localItems.length === 1 ? "punkt" : "punktów"}
            </p>
            <h1 className="font-heading text-theme-text mt-1 text-3xl font-semibold">
              Co, gdzie, kiedy
            </h1>
            <p className="text-theme-muted mt-2 truncate text-xs">
              {localItems[0]
                ? `Najbliżej: ${localItems[0].title}`
                : "Miejsce na plan albo pełen spontan."}
            </p>
          </div>
          {canManage && databaseReady ? (
            <Button
              size="icon"
              onClick={() => openEditor(null)}
              aria-label="Dodaj punkt harmonogramu"
            >
              <Plus size={20} />
            </Button>
          ) : null}
        </div>
      </header>

      {actionError && (
        <p className="border-theme-danger/30 bg-theme-danger/10 text-theme-danger rounded-xl border px-3 py-2 text-sm font-bold">
          {actionError}
        </p>
      )}

      {!databaseReady ? (
        <section className="border-theme-accent/30 bg-theme-accent/10 rounded-2xl border p-5">
          <h2 className="text-theme-text font-bold">Harmonogram czeka na migrację</h2>
          <p className="text-theme-muted mt-1 text-sm">
            Dane wyjazdu są bezpieczne. Zarządca musi uruchomić najnowszą migrację Supabase, aby
            można było dodawać wydarzenia.
          </p>
        </section>
      ) : groups.length === 0 ? (
        <section className="border-theme-border flex min-h-72 flex-col items-center justify-center gap-4 rounded-3xl border border-dashed p-8 text-center">
          <span className="bg-theme-card text-theme-primary flex h-14 w-14 items-center justify-center rounded-2xl">
            <CalendarDays size={25} />
          </span>
          <div>
            <h2 className="font-heading text-theme-text text-2xl font-semibold">
              Tu może powstać plan
            </h2>
            <p className="text-theme-muted mx-auto mt-2 max-w-64 text-sm">
              Jeśli ten wyjazd jest spontaniczny, nic nie musisz dodawać.
            </p>
          </div>
          {canManage && <Button onClick={() => openEditor(null)}>Dodaj pierwszy punkt</Button>}
        </section>
      ) : (
        <div className="flex flex-col gap-7">
          {groups.map(([date, dateItems]) => (
            <section key={date} className="flex flex-col gap-3">
              <div className="sticky top-0 z-10 -mx-1 px-1 py-1 backdrop-blur-md">
                <p className="text-theme-primary text-[10px] font-bold tracking-[0.16em] uppercase">
                  {format(parseISO(date), "EEEE", { locale: pl })}
                </p>
                <h2 className="font-heading text-theme-text text-2xl font-semibold">
                  {format(parseISO(date), "d MMMM", { locale: pl })}
                </h2>
              </div>

              <div className="before:bg-theme-border relative flex flex-col gap-3 before:absolute before:top-4 before:bottom-4 before:left-[4.45rem] before:w-px">
                {dateItems.map((item) => {
                  const content = (
                    <>
                      <div className="text-theme-muted flex w-14 shrink-0 flex-col pt-1 text-right font-mono text-xs font-bold">
                        <span>{formatTime(item.start_time) ?? "—"}</span>
                        {item.end_time && (
                          <span className="mt-0.5 text-[10px] opacity-60">
                            {formatTime(item.end_time)}
                          </span>
                        )}
                      </div>
                      <span className="bg-theme-primary ring-theme-bg relative z-10 mt-1.5 h-3 w-3 shrink-0 rounded-full ring-4" />
                      <div className="bg-theme-card border-theme-border min-w-0 flex-1 rounded-2xl border p-4 text-left">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="text-theme-text text-base font-bold">{item.title}</h3>
                            {(item.location_name || item.location_address) && (
                              <p className="text-theme-muted mt-1 flex items-start gap-1.5 text-xs">
                                <MapPin className="mt-0.5 shrink-0" size={13} />
                                <span>
                                  {[item.location_name, item.location_address]
                                    .filter(Boolean)
                                    .join(" · ")}
                                </span>
                              </p>
                            )}
                            {item.notes && (
                              <p className="text-theme-muted mt-2 line-clamp-2 text-sm">
                                {item.notes}
                              </p>
                            )}
                          </div>
                          {canManage && <Pencil className="text-theme-muted shrink-0" size={15} />}
                        </div>
                      </div>
                    </>
                  );

                  return canManage ? (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => openEditor(item)}
                      className="flex items-start gap-3 active:scale-99"
                    >
                      {content}
                    </button>
                  ) : (
                    <div key={item.id} className="flex items-start gap-3">
                      {content}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      <ResponsiveDialog
        isOpen={isEditorOpen && canManage}
        setIsOpen={setIsEditorOpen}
        title={activeItem ? "Edytuj punkt planu" : "Nowy punkt planu"}
        description="Nazwa i dzień wystarczą. Resztę możesz pominąć."
      >
        <ScheduleItemForm
          key={activeItem?.id ?? "new"}
          tripKey={tripKey}
          item={activeItem}
          initialDate={tripStartDate}
          onDone={() => setIsEditorOpen(false)}
          onDeleted={(itemId) => {
            setLocalItems((current) => current.filter((item) => item.id !== itemId));
            setActionError(null);
          }}
          onDeleteRollback={(item, error) => {
            setLocalItems((current) =>
              current.some((candidate) => candidate.id === item.id) ? current : [...current, item],
            );
            setActionError(error);
          }}
        />
      </ResponsiveDialog>
    </div>
  );
}

function ScheduleItemForm({
  tripKey,
  item,
  initialDate,
  onDone,
  onDeleted,
  onDeleteRollback,
}: {
  tripKey: string;
  item: ScheduleItem | null;
  initialDate: string | null;
  onDone: () => void;
  onDeleted: (itemId: string) => void;
  onDeleteRollback: (item: ScheduleItem, error: string) => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(item?.title ?? "");
  const [eventDate, setEventDate] = useState<Date | undefined>(
    item?.event_date ? parseISO(item.event_date) : initialDate ? parseISO(initialDate) : new Date(),
  );
  const [startTime, setStartTime] = useState(formatTime(item?.start_time) ?? "");
  const [endTime, setEndTime] = useState(formatTime(item?.end_time) ?? "");
  const [locationName, setLocationName] = useState(
    [item?.location_name, item?.location_address].filter(Boolean).join(" · "),
  );
  const [notes, setNotes] = useState(item?.notes ?? "");
  const [showDetails, setShowDetails] = useState(
    Boolean(
      item?.start_time ||
      item?.end_time ||
      item?.location_name ||
      item?.location_address ||
      item?.notes,
    ),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nullable = (value: string) => value.trim() || null;

  const save = async () => {
    if (!eventDate || !title.trim()) {
      setError("Dodaj nazwę i wybierz dzień.");
      return;
    }
    setIsSaving(true);
    setError(null);
    const result = await runClientAction(
      () =>
        saveScheduleItemAction({
          id: item?.id ?? null,
          tripKey,
          title,
          notes: nullable(notes),
          eventDate: format(eventDate, "yyyy-MM-dd"),
          startTime: nullable(startTime),
          endTime: nullable(endTime),
          locationName: nullable(locationName),
          locationAddress: null,
        }),
      "Nie udało się zapisać punktu harmonogramu.",
    );
    setIsSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
    onDone();
  };

  const remove = async () => {
    if (!item || !window.confirm("Usunąć ten punkt z harmonogramu?")) return;
    setIsSaving(true);
    setError(null);
    onDeleted(item.id);
    onDone();
    const result = await runClientAction(
      () => deleteScheduleItemAction({ id: item.id, tripKey }),
      "Nie udało się usunąć punktu harmonogramu.",
    );
    setIsSaving(false);
    if (!result.ok) {
      onDeleteRollback(item, result.error);
      return;
    }
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <div className="border-theme-danger/30 bg-theme-danger/10 text-theme-danger rounded-xl border px-3 py-2 text-sm font-bold">
          {error}
        </div>
      )}
      <Input
        label="Co robimy?"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="np. Wyjazd, plaża, kolacja"
        autoFocus
      />
      <DatePicker value={eventDate} onChange={setEventDate} />
      <button
        type="button"
        onClick={() => setShowDetails((visible) => !visible)}
        className="border-theme-border text-theme-muted hover:text-theme-text flex min-h-11 items-center justify-between rounded-xl border px-3 text-sm font-bold transition"
      >
        <span>{showDetails ? "Ukryj szczegóły" : "Dodaj godzinę, miejsce lub notatkę"}</span>
        {showDetails ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
      </button>
      {showDetails && (
        <div className="animate-fade-in flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Input
              type="time"
              label="Od"
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
            />
            <Input
              type="time"
              label="Do (opcjonalnie)"
              value={endTime}
              onChange={(event) => setEndTime(event.target.value)}
            />
          </div>
          <Input
            label="Miejsce lub adres"
            value={locationName}
            onChange={(event) => setLocationName(event.target.value)}
            placeholder="np. Plaża miejska"
          />
          <Textarea
            label="Krótka notatka"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="Tylko jeśli trzeba coś dopowiedzieć"
          />
        </div>
      )}
      <div className="flex gap-3 pt-1">
        {item && (
          <Button
            type="button"
            variant="outline"
            onClick={remove}
            disabled={isSaving}
            className="text-theme-danger shrink-0"
          >
            <Trash2 size={17} />
            Usuń
          </Button>
        )}
        <Button type="button" onClick={save} disabled={isSaving} className="flex-1">
          <Clock3 size={17} />
          {isSaving ? "Zapisywanie…" : "Zapisz punkt"}
        </Button>
      </div>
    </div>
  );
}

function groupItems(items: ScheduleItem[]) {
  const groups = new Map<string, ScheduleItem[]>();
  for (const item of items) {
    const current = groups.get(item.event_date) ?? [];
    current.push(item);
    groups.set(item.event_date, current);
  }
  return [...groups.entries()]
    .sort(([firstDate], [secondDate]) => firstDate.localeCompare(secondDate))
    .map(
      ([date, dateItems]) =>
        [
          date,
          [...dateItems].sort((first, second) =>
            (first.start_time ?? "99:99").localeCompare(second.start_time ?? "99:99"),
          ),
        ] as const,
    );
}

function formatTime(value: string | null | undefined) {
  return value ? value.slice(0, 5) : null;
}
