import Image from "next/image";
import Link from "next/link";
import { ChevronDown, Gamepad2, RefreshCw, WifiOff } from "lucide-react";
import { BagRushGame } from "~/components/modules/scoreboard/bag-rush-game";

export default function OfflinePage() {
  return (
    <div
      data-offline-fallback
      className="brand-shell flex min-h-dvh items-center px-5 py-10 text-center"
    >
      <div className="mx-auto flex w-full max-w-sm flex-col gap-4">
        <section className="bg-theme-card border-theme-border flex flex-col items-center gap-5 rounded-3xl border p-6 shadow-2xl">
          <div className="bg-theme-primary/10 flex h-20 w-20 items-center justify-center rounded-2xl">
            <Image src="/favicon.png" alt="Logo Wyjezdnika" width={80} height={80} priority />
          </div>

          <div>
            <p className="text-theme-primary text-[10px] font-bold tracking-[0.18em] uppercase">
              <WifiOff className="mr-1.5 inline" size={14} /> Tryb offline
            </p>
            <h1 className="font-heading text-theme-text mt-2 text-3xl font-semibold">
              Brak połączenia z internetem
            </h1>
            <p className="text-theme-muted mt-3 text-sm leading-relaxed">
              Aktualne dane wyjazdu wymagają połączenia z serwerem. Możesz spróbować ponownie albo
              zabić chwilę w minigrze.
            </p>
          </div>

          <Link
            href="/"
            className="bg-theme-primary text-theme-primary-foreground flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold"
          >
            <RefreshCw size={17} /> Spróbuj ponownie
          </Link>
        </section>

        <details className="bg-theme-card border-theme-border group overflow-hidden rounded-3xl border text-left shadow-xl">
          <summary className="text-theme-text flex min-h-16 cursor-pointer list-none items-center gap-3 px-4 font-bold [&::-webkit-details-marker]:hidden">
            <Gamepad2 className="text-theme-primary" size={19} />
            Zagraj offline w „Łap bagaż”
            <ChevronDown
              className="text-theme-muted ml-auto transition group-open:rotate-180"
              size={18}
            />
          </summary>
          <div className="border-theme-border border-t p-3">
            <BagRushGame />
          </div>
        </details>
      </div>
    </div>
  );
}
