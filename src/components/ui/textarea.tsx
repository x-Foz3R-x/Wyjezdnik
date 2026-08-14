"use client";

import { forwardRef, useId } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "~/lib/utils";

const textareaVariants = cva(
  "border-theme-border bg-theme-card text-theme-text placeholder:text-theme-muted focus:border-theme-primary w-full resize-y border outline-hidden transition-colors disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      size: {
        default: "min-h-28 rounded-[var(--theme-radius-control)] px-4 py-3 text-sm",
        sm: "min-h-20 rounded-[calc(var(--theme-radius-control)-0.25rem)] px-3 py-2 text-sm",
      },
    },
    defaultVariants: { size: "default" },
  },
);

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> &
  VariantProps<typeof textareaVariants> & {
    label?: string;
    className?: string;
    containerClassName?: string;
  };

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { id, label, size, className, containerClassName, ...props },
  ref,
) {
  const generatedId = useId();
  const textareaId = id ?? generatedId;

  return (
    <label htmlFor={textareaId} className={cn("flex flex-col gap-1.5", containerClassName)}>
      {label && <span className="text-theme-muted text-xs font-medium">{label}</span>}
      <textarea
        ref={ref}
        id={textareaId}
        className={cn(textareaVariants({ size }), className)}
        {...props}
      />
    </label>
  );
});
