"use client";

import { useActionState, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ChevronRight, Download, Luggage } from "lucide-react";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { joinTripByPinAction, type TripFormState } from "~/app/actions/trips";
import { Button } from "~/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "~/components/ui/input-otp";
import { getSavedTrips, type SavedTrip } from "~/lib/saved-trips";
import { usePwaInstall } from "~/components/pwa/pwa-provider";

interface StartScreenProps {
  initialError?: string | null;
  returnTo?: string | null;
}

const ERROR_MESSAGES: Record<string, string> = {
  "invalid-invite": "Link zaproszenia jest nieprawidłowy albo wygasł.",
  "access-required": "Dołącz do wyjazdu PIN-em lub skorzystaj z linku zaproszenia.",
  "session-config": "Sesje urządzeń nie są jeszcze skonfigurowane na serwerze.",
  database: "Nie udało się połączyć z bazą wyjazdów. Spróbuj ponownie.",
};

const INITIAL_TRIP_FORM_STATE: TripFormState = { error: null };

export function StartScreen({ initialError, returnTo }: StartScreenProps) {
  const { showInstallAction, requestInstall } = usePwaInstall();
  const [tripPin, setTripPin] = useState("");
  const [savedTrips, setSavedTrips] = useState<SavedTrip[]>([]);
  const [state, formAction, isPending] = useActionState(
    joinTripByPinAction,
    INITIAL_TRIP_FORM_STATE,
  );
  const message = state.error ?? (initialError ? ERROR_MESSAGES[initialError] : null);

  useEffect(() => {
    setSavedTrips(getSavedTrips());
  }, []);

  return (
    <div className="animate-fade-in flex min-h-dvh flex-col items-center px-4 py-7 text-center sm:justify-center">
      <div className="flex w-full max-w-sm flex-col items-center gap-7">
        {returnTo && (
          <Link
            href={returnTo}
            className="text-theme-muted hover:text-theme-text flex min-h-11 w-full items-center gap-2 self-start text-left text-xs font-bold transition"
          >
            <ArrowLeft size={16} /> Wróć do wyjazdu
          </Link>
        )}

        <div className="text-theme-primary bg-theme-primary/10 flex h-20 w-20 items-center justify-center rounded-2xl shadow-xs">
          <Image src="/favicon.png" alt="Logo Wyjezdnika" width={100} height={100} priority />
        </div>

        <div className="flex flex-col gap-2">
          <h1 className="font-heading text-theme-text text-4xl font-bold">Wyjezdnik</h1>
          <p className="text-theme-muted font-body px-4 text-sm">
            Wpisz 6-cyfrowy PIN wyjazdu albo skorzystaj z otrzymanego linku.
          </p>
        </div>

        <form action={formAction} className="flex w-full flex-col items-center gap-4">
          <InputOTP
            name="joinPin"
            maxLength={6}
            pattern={REGEXP_ONLY_DIGITS}
            inputMode="numeric"
            value={tripPin}
            onChange={setTripPin}
          >
            <InputOTPGroup className="gap-2">
              {[0, 1, 2, 3, 4, 5].map((index) => (
                <InputOTPSlot
                  key={index}
                  index={index}
                  className="bg-theme-card border-theme-border text-theme-text h-12 w-10 rounded-lg border text-lg font-bold sm:h-14 sm:w-12"
                />
              ))}
            </InputOTPGroup>
          </InputOTP>

          {message && <p className="text-theme-danger text-xs font-bold">{message}</p>}

          <Button
            type="submit"
            disabled={tripPin.length !== 6 || isPending}
            className="mt-4 h-12 w-full text-xs font-bold tracking-widest uppercase shadow-lg"
          >
            {isPending ? "Sprawdzanie..." : "Dołącz do wyjazdu"}
          </Button>
        </form>

        <Link
          href="/create"
          className="text-theme-muted hover:text-theme-text mt-4 text-[11px] font-bold tracking-widest uppercase underline decoration-dashed underline-offset-4 transition-colors"
        >
          Stwórz nowy wyjazd
        </Link>

        {showInstallAction && (
          <button
            type="button"
            onClick={() => void requestInstall()}
            className="border-theme-border text-theme-text bg-theme-card/70 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border px-4 text-xs font-bold"
          >
            <Download className="text-theme-primary" size={17} /> Zainstaluj aplikację
          </button>
        )}

        {savedTrips.length > 0 && (
          <section className="flex w-full flex-col gap-3 pt-2 text-left">
            <p className="text-theme-muted px-1 text-[10px] font-bold tracking-[0.16em] uppercase">
              Twoje wyjazdy
            </p>
            <div className="bg-theme-card border-theme-border divide-theme-border divide-y overflow-hidden rounded-2xl border">
              {savedTrips.map((trip) => (
                <Link
                  key={trip.urlKey}
                  href={`/t/${trip.urlKey}`}
                  className="hover:bg-theme-primary/5 flex min-h-16 items-center gap-3 px-4 py-3 transition active:scale-99"
                >
                  <span className="bg-theme-primary/10 text-theme-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                    <Luggage size={18} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="text-theme-text block truncate text-sm font-bold">
                      {trip.tripName}
                    </span>
                    <span className="text-theme-muted block truncate text-xs">
                      jako {trip.userName}
                    </span>
                  </span>
                  <ChevronRight className="text-theme-muted shrink-0" size={17} />
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
