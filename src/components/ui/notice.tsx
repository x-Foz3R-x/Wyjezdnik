import type { ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "~/lib/utils";

const noticeVariants = cva("rounded-[var(--theme-radius-control)] border px-4 py-3 text-sm", {
  variants: {
    variant: {
      neutral: "border-theme-border bg-theme-card text-theme-text",
      success: "border-theme-success/30 bg-theme-success/10 text-theme-success",
      info: "border-theme-info/30 bg-theme-info/10 text-theme-info",
      danger: "border-theme-danger/30 bg-theme-danger/10 text-theme-danger",
    },
  },
  defaultVariants: { variant: "neutral" },
});

export function Notice({
  children,
  variant,
  className,
}: {
  children: ReactNode;
  className?: string;
} & VariantProps<typeof noticeVariants>) {
  return <div className={cn(noticeVariants({ variant }), className)}>{children}</div>;
}
