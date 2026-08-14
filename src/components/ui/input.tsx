"use client";

import { forwardRef, useId, useState } from "react";
import { type HTMLMotionProps, motion } from "framer-motion";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "~/lib/utils";

const InputVariants = cva(
  "text-theme-text placeholder:text-theme-muted peer w-full appearance-none bg-transparent outline-hidden transition-colors focus:outline-hidden disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "border-theme-border bg-theme-card focus:border-theme-primary border",
        insetLabel:
          "border-theme-border bg-theme-card focus:border-theme-primary border pt-5 pb-1 shadow-xs",
      },
      size: {
        default: "h-12 rounded-[var(--theme-radius-control)] px-4 text-base",
        sm: "h-10 rounded-[calc(var(--theme-radius-control)-0.25rem)] px-3 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type HTMLInputProps = Omit<HTMLMotionProps<"input">, "size" | "className">;

export type InputProps = HTMLInputProps &
  VariantProps<typeof InputVariants> & {
    label?: string;
    className?: {
      container?: string;
      input?: string;
      label?: string;
    };
  };

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, variant, size, label, id, value, defaultValue, onChange, ...props },
  ref,
) {
  const uniqueId = useId();
  const inputId = id ?? uniqueId;
  const autoVariant = label ? "insetLabel" : variant;

  const [hasValue, setHasValue] = useState(!!value || typeof value === "number" || !!defaultValue);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setHasValue(event.target.value.length > 0);
    onChange?.(event);
  };

  return (
    <div className={cn("relative w-full focus-within:z-30", className?.container)}>
      <motion.input
        ref={ref}
        id={inputId}
        value={value}
        defaultValue={defaultValue}
        onChange={handleChange}
        className={cn(
          InputVariants({ variant: autoVariant, size }),
          label && "placeholder:opacity-0 focus:placeholder:opacity-100",
          className?.input,
        )}
        {...props}
      />

      {!!label && (
        <label
          htmlFor={inputId}
          className={cn(
            "text-theme-muted peer-focus:text-theme-primary pointer-events-none absolute inset-0 flex origin-top-left items-center overflow-hidden px-4 text-base transition-all duration-150 ease-in-out select-none peer-focus:translate-x-0.5 peer-focus:-translate-y-1.5 peer-focus:scale-[0.75]",
            hasValue && "text-theme-muted translate-x-0.5 -translate-y-1.5 scale-[0.75]",
            className?.label,
          )}
        >
          <span className="overflow-hidden text-ellipsis whitespace-nowrap">{label}</span>
        </label>
      )}
    </div>
  );
});
