"use client";

import { useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";

export function TripInviteSettingsCard({
  tripName,
  joinPin,
  inviteToken,
}: {
  tripName: string;
  joinPin: string;
  inviteToken: string;
}) {
  const [feedback, setFeedback] = useState<"pin" | "link" | null>(null);

  const showFeedback = (value: "pin" | "link") => {
    setFeedback(value);
    window.setTimeout(() => setFeedback(null), 1800);
  };

  const copy = async (value: "pin" | "link") => {
    try {
      await navigator.clipboard.writeText(
        value === "pin" ? joinPin : `${window.location.origin}/join/${inviteToken}`,
      );
      showFeedback(value);
    } catch {
      // Schowek może być niedostępny bez zgody przeglądarki.
    }
  };

  const share = async () => {
    const url = `${window.location.origin}/join/${inviteToken}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `Dołącz do wyjazdu ${tripName}`, url });
        return;
      } catch (error) {
        if (error && typeof error === "object" && "name" in error && error.name === "AbortError") {
          return;
        }
      }
    }
    await copy("link");
  };

  return (
    <Card className="gap-0 p-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-theme-primary text-[10px] font-bold tracking-[0.16em] uppercase">
            Zaproszenie do wyjazdu
          </p>
          <p className="text-theme-muted mt-1 text-xs">Wyślij link albo podaj 6-cyfrowy PIN.</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => void share()}
          className="text-theme-muted shrink-0 rounded-xl"
          aria-label="Udostępnij zaproszenie"
        >
          <Share2 size={17} />
        </Button>
      </div>
      <div className="border-theme-border mt-4 flex min-h-14 items-center justify-between rounded-xl border px-3">
        <span className="text-theme-text font-mono text-lg font-bold tracking-[0.2em]">
          {joinPin}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => void copy("pin")}
          className="text-theme-muted hover:text-theme-text gap-2"
        >
          {feedback === "pin" ? <Check size={16} /> : <Copy size={16} />}
          {feedback === "pin" ? "Skopiowano" : "Kopiuj PIN"}
        </Button>
      </div>
    </Card>
  );
}
