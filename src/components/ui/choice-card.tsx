"use client";

import { Check } from "lucide-react";
import type { ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "~/lib/utils";

const choiceCardVariants = cva(
  "border-theme-border bg-theme-card text-theme-text relative flex w-full items-start gap-3 border text-left transition disabled:cursor-not-allowed disabled:opacity-55",
  {
    variants: {
      size: {
        default: "min-h-24 rounded-[var(--theme-radius-control)] p-3",
        compact: "min-h-16 rounded-[var(--theme-radius-control)] p-3",
      },
      selected: {
        true: "border-theme-primary/55 bg-theme-primary/10 shadow-[0_0_0_1px_color-mix(in_srgb,var(--theme-primary)_18%,transparent)]",
        false: "hover:border-theme-primary/35 hover:bg-theme-card-raised",
      },
    },
    defaultVariants: { size: "default", selected: false },
  },
);

type ChoiceCardProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "title"> &
  VariantProps<typeof choiceCardVariants> & {
    title: ReactNode;
    description?: ReactNode;
    badge?: ReactNode;
    icon?: ReactNode;
    indicator?: "radio" | "check" | "none";
  };

export function ChoiceCard({
  title,
  description,
  badge,
  icon,
  selected = false,
  indicator = "radio",
  size,
  className,
  children,
  ...props
}: ChoiceCardProps) {
  return (
    <button
      type="button"
      aria-pressed={Boolean(selected)}
      className={cn(choiceCardVariants({ selected, size }), className)}
      {...props}
    >
      {indicator === "radio" && (
        <span
          className={cn(
            "border-theme-border mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border",
            selected && "border-theme-primary bg-theme-primary text-theme-primary-foreground",
          )}
        >
          {selected && <Check size={13} strokeWidth={3} />}
        </span>
      )}
      {icon && (
        <span className="bg-theme-primary/10 text-theme-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-bold">{title}</span>
          {badge && (
            <span className="bg-theme-primary/12 text-theme-primary rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase">
              {badge}
            </span>
          )}
        </span>
        {description && (
          <span className="text-theme-muted mt-1 block text-xs leading-relaxed">{description}</span>
        )}
        {children}
      </span>
      {indicator === "check" && selected && (
        <span className="bg-theme-primary text-theme-primary-foreground flex size-5 shrink-0 items-center justify-center rounded-full">
          <Check size={13} strokeWidth={3} />
        </span>
      )}
    </button>
  );
}
