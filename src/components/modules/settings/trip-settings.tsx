"use client";

import { format, parseISO } from "date-fns";
import {
  Check,
  CircleDollarSign,
  KeyRound,
  LayoutGrid,
  LockKeyhole,
  MapPin,
  Music2,
  PackageCheck,
  Palette,
  ReceiptText,
  RotateCcw,
  Settings2,
  Sparkles,
  Trash2,
  UserRound,
  UsersRound,
} from "lucide-react";
import { Avatar } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Checkbox } from "~/components/ui/checkbox";
import { ChoiceCard } from "~/components/ui/choice-card";
import { Notice } from "~/components/ui/notice";
import { Textarea } from "~/components/ui/textarea";
import { DateRangePicker } from "~/components/ui/date-range-picker";
import { ResponsiveDialog } from "~/components/ui/responsive-dialog";
import { PlaylistSettings } from "~/components/modules/settings/playlist-settings";
import {
  FeedbackBanner,
  SaveButton,
  SettingsAdvancedMenu,
  SettingsCard,
  SettingsDisclosure,
  SettingsHeader,
  SettingsMenu,
  SettingsMenuItem,
  SettingsPage,
  SettingsSectionLabel,
} from "~/components/modules/settings/settings-layout";
import { type TripSettingsProps } from "~/components/modules/settings/settings-types";
import { TripInviteSettingsCard } from "~/components/modules/settings/trip-invite-settings-card";
import { FinanceSettingsView } from "~/components/modules/settings/finance-settings-view";
import { ParticipantManager } from "~/components/modules/settings/participant-manager";
import { ModulesSettingsView } from "~/components/modules/settings/modules-settings-view";
import { useTripSettingsController } from "~/components/modules/settings/use-trip-settings-controller";
import { getFinanceModeLabel, getSettlementStrategyLabel } from "~/lib/finances";
import { cn } from "~/lib/utils";
import { PACKING_PRESETS } from "~/lib/packing";
import { LocalProfileSettings } from "~/components/profile/local-profile-settings";
import { TRIP_THEMES } from "~/lib/themes";

export function TripSettings({
  tripKey,
  isAdmin,
  currentUserId,
  initialProfile,
  initialTrip,
  participants,
  teams,
}: TripSettingsProps) {
  const {
    view,
    profile,
    setProfile,
    form,
    setForm,
    activityNow,
    packingPresetKeys,
    setPackingPresetKeys,
    isSaving,
    feedback,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    deleteConfirmation,
    setDeleteConfirmation,
    deleteAcknowledged,
    setDeleteAcknowledged,
    isDeleting,
    deleteError,
    setDeleteError,
    navigationOrder,
    openView,
    closeView,
    nullable,
    toggleModule,
    moveNavigation,
    toggleWidget,
    saveTrip,
    saveProfile,
    savePackingPresets,
    changeTripStatus,
    deleteTripPermanently,
  } = useTripSettingsController({ tripKey, isAdmin, initialProfile, initialTrip });
  if (view === "menu") {
    return (
      <SettingsPage>
        <SettingsHeader
          title="Ustawienia"
          subtitle={isAdmin ? "Twój profil i ustawienia wyjazdu" : "Twój profil w tym wyjeździe"}
          backHref={`/t/${tripKey}`}
        />

        {isAdmin && initialTrip.joinPin && initialTrip.inviteToken && (
          <TripInviteSettingsCard
            tripName={form.name}
            joinPin={initialTrip.joinPin}
            inviteToken={initialTrip.inviteToken}
          />
        )}

        {initialTrip.status === "closed" && (
          <div className="border-theme-primary/30 bg-theme-primary/8 flex items-start gap-3 rounded-2xl border p-4">
            <LockKeyhole className="text-theme-primary mt-0.5 shrink-0" size={18} />
            <div>
              <p className="text-theme-text text-sm font-bold">Wyjazd jest zamknięty</p>
              <p className="text-theme-muted mt-1 text-xs leading-relaxed">
                Nie można dopisywać wydatków ani zmieniać planu. Profil oraz zgłaszanie i
                potwierdzanie zwrotów pozostają dostępne.
              </p>
            </div>
          </div>
        )}

        <SettingsSectionLabel>Najczęściej używane</SettingsSectionLabel>
        <SettingsMenu>
          <SettingsMenuItem
            icon={UserRound}
            title="Mój profil"
            description="Nazwa, PIN i dane do przelewu"
            onClick={() => openView("profile")}
          />
          {isAdmin && initialTrip.status !== "closed" && (
            <>
              <SettingsMenuItem
                icon={Settings2}
                title="Informacje o wyjeździe"
                description="Nazwa, termin i miejsce docelowe"
                onClick={() => openView("details")}
              />
              <SettingsMenuItem
                icon={Palette}
                title="Wygląd wyjazdu"
                description={
                  TRIP_THEMES.find((theme) => theme.key === form.theme)?.name ?? "Motyw aplikacji"
                }
                onClick={() => openView("appearance")}
              />
              {form.modules.finances && (
                <SettingsMenuItem
                  icon={ReceiptText}
                  title="Rozliczenia"
                  description={`${getFinanceModeLabel(form.financeMode)} · ${getSettlementStrategyLabel(form.settlementStrategy)}`}
                  onClick={() => openView("finances")}
                />
              )}
              <SettingsMenuItem
                icon={UsersRound}
                title="Uczestnicy"
                description="Profile, role, aktywność i PIN-y"
                onClick={() => openView("participants")}
              />
            </>
          )}
        </SettingsMenu>

        {isAdmin && initialTrip.status !== "closed" && (
          <SettingsAdvancedMenu>
            <SettingsMenuItem
              icon={Sparkles}
              title="Moduły i nawigacja"
              description="Funkcje wyjazdu i kolejność dolnego paska"
              onClick={() => openView("modules")}
            />
            {form.modules.scoreboard && (
              <SettingsMenuItem
                icon={LayoutGrid}
                title="Elementy Rozrywki"
                description="Punktacja, wyzwania, głosowania i koło"
                onClick={() => openView("widgets")}
              />
            )}
            <SettingsMenuItem
              icon={Music2}
              title="Playlisty"
              description="Soundtracki dostępne dla całej ekipy"
              onClick={() => openView("playlists")}
            />
            <SettingsMenuItem
              icon={PackageCheck}
              title="Pakowanie"
              description="Gotowe zestawy rzeczy dla uczestników"
              onClick={() => openView("packing")}
            />
          </SettingsAdvancedMenu>
        )}

        {isAdmin && (
          <>
            <SettingsSectionLabel>Zarządzanie wyjazdem</SettingsSectionLabel>
            <SettingsMenu>
              <SettingsMenuItem
                icon={initialTrip.status === "closed" ? RotateCcw : LockKeyhole}
                title={initialTrip.status === "closed" ? "Otwórz wyjazd" : "Zakończ wyjazd"}
                description={
                  initialTrip.status === "closed"
                    ? "Wznów możliwość wprowadzania zmian"
                    : "Zablokuj zmiany i zachowaj historię"
                }
                onClick={() => openView("lifecycle")}
              />
            </SettingsMenu>
          </>
        )}
      </SettingsPage>
    );
  }

  if (view === "profile") {
    return (
      <SettingsPage>
        <SettingsHeader title="Mój profil" onBack={closeView} />
        <FeedbackBanner feedback={feedback} />
        <SettingsCard>
          <div className="flex items-center gap-3">
            <Avatar
              user={{
                id: `${tripKey}-${initialProfile.name}`,
                name: profile.name || initialProfile.name,
                avatarUrl: nullable(profile.avatarUrl),
              }}
              className="h-16 w-16 text-2xl"
            />
            <div>
              <p className="text-theme-text font-bold">{profile.name || "Twój profil"}</p>
              <p className="text-theme-muted text-xs">Widoczny tylko w tym wyjeździe</p>
            </div>
          </div>
          <Input
            label="Nazwa"
            value={profile.name}
            onChange={(event) => setProfile({ ...profile, name: event.target.value })}
          />
        </SettingsCard>
        <LocalProfileSettings
          currentProfile={{
            name: profile.name,
            avatarUrl: profile.avatarUrl,
            phone: profile.phone,
            revolutUrl: profile.revolutUrl,
            paymentNote: profile.paymentNote,
          }}
          onApply={(local) =>
            setProfile((current) => ({
              ...current,
              ...local,
            }))
          }
        />
        <SettingsDisclosure
          title="Dane profilu i płatności"
          description="Avatar, telefon, BLIK, Revolut i inne formy zwrotu"
          icon={CircleDollarSign}
          defaultOpen={Boolean(
            profile.avatarUrl || profile.phone || profile.revolutUrl || profile.paymentNote,
          )}
        >
          <Input
            type="url"
            label="Link do avatara"
            value={profile.avatarUrl}
            onChange={(event) => setProfile({ ...profile, avatarUrl: event.target.value })}
            placeholder="https://..."
          />
          <Input
            type="tel"
            label="Telefon / BLIK"
            value={profile.phone}
            onChange={(event) => setProfile({ ...profile, phone: event.target.value })}
            placeholder="+48 123 456 789"
          />
          <Input
            label="Revolut"
            value={profile.revolutUrl}
            onChange={(event) => setProfile({ ...profile, revolutUrl: event.target.value })}
            placeholder="@nazwa lub link revolut.me"
          />
          <Textarea
            label="Inny sposób zwrotu pieniędzy"
            value={profile.paymentNote}
            onChange={(event) => setProfile({ ...profile, paymentNote: event.target.value })}
            placeholder="np. numer konta albo informacja: najlepiej gotówką"
            rows={3}
            maxLength={500}
          />
          <p className="text-theme-muted text-xs">
            Dane przelewowe zobaczą uczestnicy, którym masz zwrócić pieniądze.
          </p>
        </SettingsDisclosure>
        <SettingsDisclosure
          title="Zmiana PIN-u"
          description="Opcjonalna zmiana 4-cyfrowego PIN-u tego profilu"
          icon={KeyRound}
        >
          <Input
            type="password"
            inputMode="numeric"
            label="Nowy PIN"
            value={profile.newPin}
            onChange={(event) =>
              setProfile({ ...profile, newPin: event.target.value.replace(/\D/g, "").slice(0, 4) })
            }
            placeholder="Zostaw puste, aby nie zmieniać"
            maxLength={4}
          />
          <p className="text-theme-muted text-xs">
            Nowy PIN musi mieć dokładnie 4 cyfry. Zostaw pole puste, aby zachować obecny.
          </p>
        </SettingsDisclosure>
        <SaveButton isSaving={isSaving} onClick={() => void saveProfile()} label="Zapisz profil" />
      </SettingsPage>
    );
  }

  if (view === "details") {
    return (
      <SettingsPage>
        <SettingsHeader title="Informacje o wyjeździe" onBack={closeView} />
        <FeedbackBanner feedback={feedback} />
        <SettingsCard>
          <Input
            label="Nazwa wyjazdu"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />
          <DateRangePicker
            value={{
              from: form.startDate ? parseISO(form.startDate) : undefined,
              to: form.endDate ? parseISO(form.endDate) : undefined,
            }}
            onChange={(range) =>
              setForm({
                ...form,
                startDate: range.from ? format(range.from, "yyyy-MM-dd") : "",
                endDate: range.to ? format(range.to, "yyyy-MM-dd") : "",
              })
            }
          />
        </SettingsCard>
        <SettingsCard title="Miejsce docelowe" icon={MapPin}>
          <Input
            label="Nazwa miejsca"
            value={form.destinationName}
            onChange={(event) => setForm({ ...form, destinationName: event.target.value })}
          />
          <Input
            label="Adres"
            value={form.destinationAddress}
            onChange={(event) => setForm({ ...form, destinationAddress: event.target.value })}
          />
          <Input
            type="url"
            label="Link do mapy"
            value={form.destinationMapUrl}
            onChange={(event) => setForm({ ...form, destinationMapUrl: event.target.value })}
          />
        </SettingsCard>
        <SaveButton isSaving={isSaving} onClick={() => void saveTrip()} />
      </SettingsPage>
    );
  }

  if (view === "appearance") {
    return (
      <SettingsPage>
        <SettingsHeader title="Wygląd wyjazdu" onBack={closeView} />
        <FeedbackBanner feedback={feedback} />
        <SettingsCard title="Motyw aplikacji" icon={Palette}>
          <p className="text-theme-muted text-xs leading-relaxed">
            Motyw należy do wyjazdu, więc po zapisaniu zobaczy go cała ekipa na każdym urządzeniu.
            Wybór poniżej od razu pokazuje podgląd.
          </p>
          <div className="flex flex-col gap-3">
            {TRIP_THEMES.map((theme) => (
              <ChoiceCard
                key={theme.key}
                selected={form.theme === theme.key}
                indicator="check"
                title={theme.name}
                description={theme.description}
                onClick={() => setForm((current) => ({ ...current, theme: theme.key }))}
              >
                <span className="mt-3 flex gap-1.5" aria-hidden="true">
                  {theme.colors.map((color) => (
                    <span
                      key={color}
                      className="border-theme-text/10 h-8 flex-1 rounded-lg border"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </span>
              </ChoiceCard>
            ))}
          </div>
        </SettingsCard>
        <Notice variant="info" className="text-xs leading-relaxed">
          Fundament motywów obejmuje już kolory, promienie, cienie, tło i charakter nagłówków.
          Dzięki temu później można dodać wariant typografii albo kształtu sekcji bez przepisywania
          ekranów.
        </Notice>
        <SaveButton isSaving={isSaving} onClick={() => void saveTrip()} />
      </SettingsPage>
    );
  }

  if (view === "modules" || view === "widgets") {
    return (
      <ModulesSettingsView
        view={view}
        form={form}
        feedback={feedback}
        isSaving={isSaving}
        navigationOrder={navigationOrder}
        closeView={closeView}
        toggleModule={toggleModule}
        moveNavigation={moveNavigation}
        toggleWidget={toggleWidget}
        saveTrip={saveTrip}
      />
    );
  }
  if (view === "finances") {
    return (
      <FinanceSettingsView
        form={form}
        setForm={setForm}
        initialTrip={initialTrip}
        participants={participants}
        feedback={feedback}
        isSaving={isSaving}
        closeView={closeView}
        saveTrip={saveTrip}
      />
    );
  }
  if (view === "packing") {
    return (
      <SettingsPage>
        <SettingsHeader title="Pakowanie ekipy" onBack={closeView} />
        <FeedbackBanner feedback={feedback} />
        <p className="text-theme-muted text-sm leading-relaxed">
          Wybierz tylko sytuacje pasujące do tego wyjazdu. Każda osoba dostanie własną listę i może
          dopisać lub ukryć rzeczy bez wpływu na innych.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {PACKING_PRESETS.map((preset) => {
            const selected = packingPresetKeys.includes(preset.key);
            return (
              <button
                key={preset.key}
                type="button"
                aria-pressed={selected}
                onClick={() =>
                  setPackingPresetKeys((current) =>
                    selected
                      ? current.filter((key) => key !== preset.key)
                      : [...current, preset.key],
                  )
                }
                className={cn(
                  "relative flex min-h-28 flex-col items-start rounded-2xl border p-3 text-left transition active:scale-98",
                  selected
                    ? "border-theme-primary/45 bg-theme-primary/10"
                    : "border-theme-border bg-theme-card",
                )}
              >
                <PackageCheck
                  className={selected ? "text-theme-primary" : "text-theme-muted"}
                  size={18}
                />
                <span className="text-theme-text mt-4 text-sm font-bold">{preset.name}</span>
                <span className="text-theme-muted mt-1 text-[11px] leading-snug">
                  {preset.description}
                </span>
                {selected && (
                  <Check className="text-theme-primary absolute top-3 right-3" size={15} />
                )}
              </button>
            );
          })}
        </div>
        <SaveButton
          isSaving={isSaving}
          onClick={() => void savePackingPresets()}
          label="Zapisz zestawy"
        />
      </SettingsPage>
    );
  }

  if (view === "lifecycle") {
    const isClosed = initialTrip.status === "closed";
    return (
      <SettingsPage>
        <SettingsHeader
          title={isClosed ? "Zamknięty wyjazd" : "Zakończenie wyjazdu"}
          onBack={closeView}
        />
        <FeedbackBanner feedback={feedback} />
        <SettingsCard icon={isClosed ? RotateCcw : LockKeyhole}>
          <p className="text-theme-text text-base font-bold">
            {isClosed
              ? "Historia jest zabezpieczona"
              : "Zamknij dopiero po ostatnich rozliczeniach"}
          </p>
          <p className="text-theme-muted text-sm leading-relaxed">
            {isClosed
              ? "Uczestnicy nadal widzą całą historię. Nie mogą zmieniać wydatków ani pozostałych modułów, ale mogą uzupełnić profil oraz dokończyć zgłaszanie i potwierdzanie zwrotów."
              : "Zamknięcie nie usuwa wyjazdu. Zatrzymuje dopisywanie wydatków i edycję pozostałych modułów, ale pozwala ekipie spokojnie dokończyć przelewy."}
          </p>
          {initialTrip.closedAt && (
            <p className="text-theme-muted text-xs">
              Zamknięto{" "}
              {new Intl.DateTimeFormat("pl-PL", {
                dateStyle: "long",
                timeStyle: "short",
              }).format(new Date(initialTrip.closedAt))}
            </p>
          )}
          <Button
            type="button"
            variant={isClosed ? "outline" : "default"}
            className={isClosed ? undefined : "bg-theme-danger hover:bg-theme-danger/90 text-white"}
            disabled={isSaving}
            onClick={() => void changeTripStatus(isClosed ? "active" : "closed")}
          >
            {isSaving ? "Zapisywanie…" : isClosed ? "Otwórz wyjazd ponownie" : "Zamknij wyjazd"}
          </Button>
        </SettingsCard>
        <SettingsCard title="Strefa nieodwracalna" icon={Trash2}>
          <p className="text-theme-muted text-sm leading-relaxed">
            Trwałe usunięcie kasuje uczestników, zakupy, rozrywkę, harmonogram i wszystkie
            rozliczenia. Tej operacji nie można cofnąć.
          </p>
          <p className="text-theme-muted text-xs">
            Obecnie: {participants.length} uczestników i {initialTrip.financeEntryCount} wpisów w
            rozliczeniach.
          </p>
          <Button
            type="button"
            variant="outline"
            className="border-theme-danger/40 text-theme-danger hover:bg-theme-danger/10"
            onClick={() => {
              setDeleteConfirmation("");
              setDeleteAcknowledged(false);
              setDeleteError(null);
              setIsDeleteDialogOpen(true);
            }}
          >
            <Trash2 size={17} /> Usuń wyjazd na zawsze
          </Button>
        </SettingsCard>

        <ResponsiveDialog
          isOpen={isDeleteDialogOpen}
          setIsOpen={(open) => {
            if (isDeleting) return;
            setIsDeleteDialogOpen(open);
          }}
          title="Trwale usunąć wyjazd?"
          description="To nie jest archiwizacja. Po zatwierdzeniu nie będzie możliwości odzyskania danych."
        >
          <div className="flex flex-col gap-4">
            <div className="border-theme-danger/30 bg-theme-danger/10 rounded-2xl border p-4">
              <p className="text-theme-danger text-sm font-bold">
                Zniknie cały wyjazd „{initialTrip.name}”
              </p>
              <p className="text-theme-muted mt-1 text-xs leading-relaxed">
                Wraz z nim zostaną usunięte wszystkie dane uczestników i modułów.
              </p>
            </div>

            <Input
              label={`Wpisz dokładnie: ${initialTrip.name}`}
              value={deleteConfirmation}
              autoComplete="off"
              disabled={isDeleting}
              onChange={(event) => setDeleteConfirmation(event.target.value)}
            />

            <Checkbox
              checked={deleteAcknowledged}
              disabled={isDeleting}
              onChange={setDeleteAcknowledged}
              label="Rozumiem, że usunięcia nie można cofnąć i że archiwizacja zachowałaby dane."
              className="border-theme-border bg-theme-card min-h-14 rounded-[var(--theme-radius-control)] border p-3"
            />

            {deleteError && <FeedbackBanner feedback={{ type: "error", text: deleteError }} />}

            <Button
              type="button"
              disabled={
                isDeleting || deleteConfirmation !== initialTrip.name || !deleteAcknowledged
              }
              className="bg-theme-danger hover:bg-theme-danger/90 text-white"
              onClick={() => void deleteTripPermanently()}
            >
              <Trash2 size={17} />
              {isDeleting ? "Usuwanie całego wyjazdu…" : "Trwale usuń cały wyjazd"}
            </Button>
          </div>
        </ResponsiveDialog>
      </SettingsPage>
    );
  }

  if (view === "playlists") {
    return (
      <SettingsPage>
        <SettingsHeader title="Playlisty" onBack={closeView} />
        <SettingsCard>
          <p className="text-theme-muted text-xs">
            Dodaj tyle soundtracków, ile potrzebuje ten wyjazd. Pojawią się automatycznie w Bazie i
            w „Więcej”.
          </p>
          <PlaylistSettings tripKey={tripKey} playlists={initialTrip.playlists} />
        </SettingsCard>
      </SettingsPage>
    );
  }

  return (
    <SettingsPage>
      <SettingsHeader title="Uczestnicy" onBack={closeView} />
      <ParticipantManager
        tripKey={tripKey}
        currentUserId={currentUserId}
        participants={participants}
        teams={teams}
        teamsEnabled={form.dashboardWidgets.includes("scoreboard")}
        activityNow={activityNow}
      />
    </SettingsPage>
  );
}
