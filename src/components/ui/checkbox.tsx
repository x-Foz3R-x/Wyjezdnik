// src/components/ui/checkbox.tsx
"use client";

import { useId, type ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "~/lib/utils";

interface CheckboxProps {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  className?: string;
}

export function Checkbox({
  id,
  checked,
  onChange,
  label,
  description,
  disabled = false,
  className,
}: CheckboxProps) {
  const generatedId = useId();
  const checkboxId = id ?? generatedId;

  return (
    <label
      htmlFor={checkboxId}
      className={cn(
        "group flex cursor-pointer items-start gap-3 py-2 transition-all active:scale-98",
        disabled && "cursor-not-allowed opacity-50 active:scale-100",
        className,
      )}
    >
      <div className="relative mt-0.5 flex shrink-0 items-center justify-center">
        <input
          type="checkbox"
          id={checkboxId}
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <div
          className={cn(
            "flex h-5 w-5 items-center justify-center rounded-md border transition-all duration-200 ease-in-out",
            checked
              ? "border-theme-primary bg-theme-primary"
              : "bg-theme-bg group-hover:border-theme-primary/50 border-theme-border",
          )}
        >
          <Check
            size={14}
            strokeWidth={3}
            className={cn(
              "text-theme-primary-foreground transition-transform duration-200",
              checked ? "scale-100 opacity-100" : "scale-50 opacity-0",
            )}
          />
        </div>
      </div>
      {(label ?? description) && (
        <span className="min-w-0 select-none">
          {label && <span className="text-theme-text block text-sm font-medium">{label}</span>}
          {description && (
            <span className="text-theme-muted mt-0.5 block text-xs leading-relaxed">
              {description}
            </span>
          )}
        </span>
      )}
    </label>
  );
}
