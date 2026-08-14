"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Save,
  Settings2,
  type LucideIcon,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Notice } from "~/components/ui/notice";
import type { Feedback } from "~/components/modules/settings/settings-types";

export function SettingsPage({ children }: { children: ReactNode }) {
  return <div className="animate-fade-in pb-safe flex flex-col gap-5 pt-2">{children}</div>;
}

export function SettingsHeader({
  title,
  subtitle,
  backHref,
  onBack,
}: {
  title: string;
  subtitle?: string;
  backHref?: string;
  onBack?: () => void;
}) {
  const backContent = <ArrowLeft size={19} />;
  const backClassName =
    "bg-theme-card border-theme-border text-theme-muted hover:text-theme-text flex size-11 shrink-0 items-center justify-center rounded-full border transition";

  return (
    <header className="flex items-center gap-3">
      {backHref ? (
        <Link href={backHref} className={backClassName} aria-label="Wróć">
          {backContent}
        </Link>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onBack}
          className="text-theme-muted hover:text-theme-text shrink-0"
          aria-label="Wróć"
        >
          {backContent}
        </Button>
      )}
      <div className="min-w-0">
        <h1 className="font-heading text-theme-text text-2xl font-semibold">{title}</h1>
        {subtitle && <p className="text-theme-muted mt-0.5 truncate text-xs">{subtitle}</p>}
      </div>
    </header>
  );
}

export function SettingsMenu({ children }: { children: ReactNode }) {
  return <Card className="divide-theme-border gap-0 divide-y py-0 shadow-none">{children}</Card>;
}

export function SettingsSectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-theme-muted -mb-2 px-1 text-[10px] font-bold tracking-[0.16em] uppercase">
      {children}
    </p>
  );
}

export function SettingsAdvancedMenu({ children }: { children: ReactNode }) {
  return (
    <details className="bg-theme-card border-theme-border group overflow-hidden rounded-[var(--theme-radius-card)] border shadow-[var(--theme-shadow-card)]">
      <summary className="hover:bg-theme-primary/5 flex min-h-18 cursor-pointer list-none items-center gap-3 px-4 py-3 transition [&::-webkit-details-marker]:hidden">
        <span className="bg-theme-primary/10 text-theme-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
          <Settings2 size={18} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="text-theme-text block text-sm font-bold">Więcej możliwości</span>
          <span className="text-theme-muted mt-0.5 block text-[11px]">
            Moduły, układ, Rozrywka, playlisty i pakowanie
          </span>
        </span>
        <ChevronDown
          className="text-theme-muted shrink-0 transition group-open:rotate-180"
          size={17}
        />
      </summary>
      <div className="border-theme-border divide-theme-border divide-y border-t">{children}</div>
    </details>
  );
}

export function SettingsMenuItem({
  icon: Icon,
  title,
  description,
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="hover:bg-theme-primary/5 flex min-h-18 w-full items-center gap-3 px-4 py-3 text-left transition active:scale-99"
    >
      <span className="bg-theme-primary/10 text-theme-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
        <Icon size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="text-theme-text block truncate text-sm font-bold">{title}</span>
        <span className="text-theme-muted mt-0.5 block truncate text-[11px]">{description}</span>
      </span>
      <ChevronRight className="text-theme-muted shrink-0" size={17} />
    </button>
  );
}

export function SettingsCard({
  title,
  icon: Icon,
  children,
}: {
  title?: string;
  icon?: LucideIcon;
  children: ReactNode;
}) {
  return (
    <Card className="flex flex-col gap-4 p-4 py-4">
      {title && (
        <h2 className="text-theme-text flex items-center gap-2 text-sm font-bold">
          {Icon && <Icon className="text-theme-primary" size={17} />} {title}
        </h2>
      )}
      {children}
    </Card>
  );
}

export function SettingsDisclosure({
  title,
  description,
  icon: Icon,
  defaultOpen = false,
  children,
}: {
  title: string;
  description: string;
  icon?: LucideIcon;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <details
      className="bg-theme-card border-theme-border group overflow-hidden rounded-[var(--theme-radius-card)] border shadow-[var(--theme-shadow-card)]"
      open={isOpen}
      onToggle={(event) => setIsOpen(event.currentTarget.open)}
    >
      <summary className="hover:bg-theme-primary/5 flex min-h-17 cursor-pointer list-none items-center gap-3 px-4 py-3 transition [&::-webkit-details-marker]:hidden">
        {Icon && (
          <span className="bg-theme-primary/10 text-theme-primary flex size-9 shrink-0 items-center justify-center rounded-xl">
            <Icon size={17} />
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="text-theme-text block text-sm font-bold">{title}</span>
          <span className="text-theme-muted mt-0.5 block text-[11px] leading-snug">
            {description}
          </span>
        </span>
        <ChevronDown
          className="text-theme-muted shrink-0 transition group-open:rotate-180"
          size={17}
        />
      </summary>
      <div className="border-theme-border flex flex-col gap-4 border-t p-4">{children}</div>
    </details>
  );
}

export function FeedbackBanner({ feedback }: { feedback: Feedback }) {
  if (!feedback) return null;

  return (
    <Notice variant={feedback.type === "success" ? "success" : "danger"} className="font-bold">
      {feedback.text}
    </Notice>
  );
}

export function SaveButton({
  isSaving,
  onClick,
  label = "Zapisz ustawienia",
}: {
  isSaving: boolean;
  onClick: () => void;
  label?: string;
}) {
  return (
    <Button onClick={onClick} disabled={isSaving} size="lg" className="gap-2">
      <Save size={18} /> {isSaving ? "Zapisywanie…" : label}
    </Button>
  );
}
