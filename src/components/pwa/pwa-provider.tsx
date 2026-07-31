"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Download, RefreshCw, Share2, WifiOff, X } from "lucide-react";
import { Button } from "~/components/ui/button";

type InstallState = "checking" | "available" | "installed" | "ios" | "unavailable";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type PwaContextValue = {
  canInstall: boolean;
  showInstallAction: boolean;
  installState: InstallState;
  requestInstall: () => Promise<void>;
};

const PwaContext = createContext<PwaContextValue>({
  canInstall: false,
  showInstallAction: true,
  installState: "checking",
  requestInstall: async () => undefined,
});

const PROMPT_DISMISSED_KEY = "wyjezdnik:pwa-prompt-dismissed";

export function PwaProvider({ children }: { children: React.ReactNode }) {
  const [installState, setInstallState] = useState<InstallState>("checking");
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallPromptVisible, setIsInstallPromptVisible] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [isOfflineFallback, setIsOfflineFallback] = useState(false);
  const [serviceWorkerState, setServiceWorkerState] = useState<
    "active" | "disabled" | "error" | "registering"
  >("disabled");
  const [updateRegistration, setUpdateRegistration] = useState<ServiceWorkerRegistration | null>(
    null,
  );
  const [isUpdatePromptVisible, setIsUpdatePromptVisible] = useState(false);
  const shouldReloadForUpdate = useRef(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    const ios =
      /iphone|ipad|ipod/i.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const promptWasDismissed = readPromptDismissed();
    const renderedOfflineFallback = document.querySelector("[data-offline-fallback]") !== null;

    setIsOfflineFallback(renderedOfflineFallback);
    setIsOffline(renderedOfflineFallback || !navigator.onLine);
    if (standalone) {
      setInstallState("installed");
    } else if (ios) {
      setInstallState("ios");
      setIsInstallPromptVisible(!promptWasDismissed);
    } else {
      setInstallState("unavailable");
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
      setInstallState("available");
      setIsInstallPromptVisible(!readPromptDismissed());
    };
    const handleInstalled = () => {
      setInstallPrompt(null);
      setInstallState("installed");
      setIsInstallPromptVisible(false);
    };
    const handleOnline = () => {
      setIsOffline(false);
      if ("serviceWorker" in navigator) {
        void navigator.serviceWorker
          .getRegistration()
          .then((registration) => registration?.update())
          .catch(() => undefined);
      }
    };
    const handleOffline = () => setIsOffline(true);
    const handleControllerChange = () => {
      if (shouldReloadForUpdate.current) window.location.reload();
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    navigator.serviceWorker?.addEventListener("controllerchange", handleControllerChange);

    let disposed = false;
    if (
      process.env.NODE_ENV === "production" &&
      "serviceWorker" in navigator &&
      !renderedOfflineFallback &&
      navigator.onLine
    ) {
      setServiceWorkerState("registering");
      void navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .then((registration) => {
          if (disposed) return;

          void navigator.serviceWorker.ready.then(() => {
            if (!disposed) setServiceWorkerState("active");
          });

          const showUpdate = () => {
            if (!navigator.serviceWorker.controller) return;
            setUpdateRegistration(registration);
            setIsUpdatePromptVisible(true);
          };

          if (registration.waiting) showUpdate();
          registration.addEventListener("updatefound", () => {
            const worker = registration.installing;
            if (!worker) return;
            worker.addEventListener("statechange", () => {
              if (worker.state === "installed") showUpdate();
            });
          });

          void registration.update();
        })
        .catch(() => {
          if (!disposed) setServiceWorkerState("error");
          // Brak service workera nie może blokować zwykłego korzystania z aplikacji.
        });
    }

    return () => {
      disposed = true;
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      navigator.serviceWorker?.removeEventListener("controllerchange", handleControllerChange);
    };
  }, []);

  const requestInstall = useCallback(async () => {
    if (installState === "ios" || installState === "unavailable" || installState === "checking") {
      setIsInstallPromptVisible(true);
      return;
    }
    if (!installPrompt) return;

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setInstallPrompt(null);
    setIsInstallPromptVisible(false);
    if (choice.outcome === "accepted") setInstallState("installed");
    else setInstallState("unavailable");
  }, [installPrompt, installState]);

  const dismissInstallPrompt = () => {
    setIsInstallPromptVisible(false);
    try {
      window.sessionStorage.setItem(PROMPT_DISMISSED_KEY, "1");
    } catch {
      // Prywatny tryb przeglądarki może blokować pamięć sesji.
    }
  };

  const applyUpdate = () => {
    const waitingWorker = updateRegistration?.waiting;
    if (!waitingWorker) return;
    shouldReloadForUpdate.current = true;
    waitingWorker.postMessage({ type: "SKIP_WAITING" });
  };

  const value = useMemo<PwaContextValue>(
    () => ({
      canInstall: installState === "available" || installState === "ios",
      showInstallAction: installState !== "installed",
      installState,
      requestInstall,
    }),
    [installState, requestInstall],
  );

  return (
    <PwaContext.Provider value={value}>
      {children}

      <span
        aria-hidden="true"
        className="sr-only"
        data-pwa-install-state={installState}
        data-pwa-service-worker-state={serviceWorkerState}
      />

      {isOffline && !isOfflineFallback && (
        <div
          role="status"
          className="bg-theme-card border-theme-border text-theme-text fixed top-[max(0.75rem,env(safe-area-inset-top))] left-1/2 z-[80] flex min-h-11 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 items-center gap-2 rounded-xl border px-3 text-xs font-bold shadow-2xl"
        >
          <WifiOff className="text-theme-primary shrink-0" size={16} />
          Brak internetu · zmiany wymagają połączenia
        </div>
      )}

      {isUpdatePromptVisible && (
        <PwaPromptCard
          icon={RefreshCw}
          title="Nowa wersja jest gotowa"
          description="Odśwież aplikację, aby korzystać z najnowszych poprawek."
          actionLabel="Odśwież"
          onAction={applyUpdate}
          onDismiss={() => setIsUpdatePromptVisible(false)}
        />
      )}

      {!isUpdatePromptVisible && isInstallPromptVisible && installState === "available" && (
        <PwaPromptCard
          icon={Download}
          title="Zainstaluj Wyjezdnika"
          description="Uruchamiaj go z ekranu telefonu jak zwykłą aplikację — bez linku z Messengera."
          actionLabel="Zainstaluj"
          onAction={() => void requestInstall()}
          onDismiss={dismissInstallPrompt}
        />
      )}

      {!isUpdatePromptVisible && isInstallPromptVisible && installState === "ios" && (
        <PwaPromptCard
          icon={Share2}
          title="Dodaj Wyjezdnika do ekranu początkowego"
          description="W Safari stuknij Udostępnij, wybierz „Do ekranu głównego”, włącz „Otwórz jako aplikację” i stuknij Dodaj."
          actionLabel="Rozumiem"
          onAction={dismissInstallPrompt}
          onDismiss={dismissInstallPrompt}
        />
      )}

      {!isUpdatePromptVisible &&
        isInstallPromptVisible &&
        (installState === "unavailable" || installState === "checking") && (
          <PwaPromptCard
            icon={Download}
            title="Instalacja nie jest dostępna w tej przeglądarce"
            description="Tryb responsive zmienia tylko rozmiar ekranu i nie udaje instalacji telefonu. Otwórz produkcyjną wersję przez HTTPS w Chrome lub Edge. Z przeglądarki Messengera wybierz najpierw „Otwórz w przeglądarce”."
            actionLabel="Rozumiem"
            onAction={dismissInstallPrompt}
            onDismiss={dismissInstallPrompt}
          />
        )}
    </PwaContext.Provider>
  );
}

export function usePwaInstall() {
  return useContext(PwaContext);
}

function PwaPromptCard({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  onDismiss,
}: {
  icon: typeof Download;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
  onDismiss: () => void;
}) {
  return (
    <aside className="bg-theme-card border-theme-border fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-[90] flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 flex-col gap-3 rounded-2xl border p-4 shadow-2xl">
      <div className="flex items-start gap-3">
        <span className="bg-theme-primary/10 text-theme-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
          <Icon size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-theme-text text-sm font-bold">{title}</p>
          <p className="text-theme-muted mt-1 text-xs leading-relaxed">{description}</p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="text-theme-muted hover:text-theme-text -mt-1 -mr-1 flex size-10 shrink-0 items-center justify-center rounded-full"
          aria-label="Zamknij"
        >
          <X size={17} />
        </button>
      </div>
      <Button type="button" onClick={onAction} className="w-full">
        {actionLabel}
      </Button>
    </aside>
  );
}

function readPromptDismissed() {
  try {
    return window.sessionStorage.getItem(PROMPT_DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}
