"use client";

import { forwardRef } from "react";
import { type HTMLMotionProps, motion } from "framer-motion";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "~/lib/utils";

export const ButtonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap text-sm font-bold transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-theme-primary/50 disabled:pointer-events-none disabled:opacity-50 select-none",
  {
    variants: {
      variant: {
        default:
          "bg-theme-primary text-theme-primary-foreground shadow hover:bg-theme-primary-hover active:bg-theme-primary-active",
        outline:
          "border-theme-border text-theme-text border bg-transparent hover:bg-theme-card-raised",
        secondary:
          "bg-theme-card text-theme-text hover:bg-theme-card-raised border-theme-border border",
        subtle: "bg-theme-primary/10 text-theme-primary hover:bg-theme-primary/16",
        ghost: "text-theme-text hover:bg-theme-card",
        link: "text-theme-primary underline-offset-4 hover:underline",
        danger: "bg-theme-danger text-white shadow hover:bg-theme-danger/90",
      },
      size: {
        default: "h-11 px-4 py-2 rounded-[var(--theme-radius-control)]",
        sm: "h-9 rounded-[calc(var(--theme-radius-control)-0.25rem)] px-3",
        lg: "h-12 rounded-[var(--theme-radius-card)] px-8 text-base",
        icon: "h-11 w-11 rounded-full",
        iconSm: "h-9 w-9 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export type ButtonProps = HTMLMotionProps<"button"> & VariantProps<typeof ButtonVariants>;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, whileTap = { scale: 0.95 }, disabled, children, ...props },
  ref,
) {
  return (
    <motion.button
      ref={ref}
      className={cn(ButtonVariants({ variant, size, className }))}
      disabled={disabled}
      whileTap={disabled ? undefined : whileTap}
      {...props}
    >
      {children}
    </motion.button>
  );
});
