"use client";

import * as React from "react";
import { ArrowLeft } from "lucide-react";
import { useMediaQuery } from "~/hooks/use-media-query";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "~/components/ui/drawer";
import { cn } from "~/lib/utils";

interface DrawerDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  title?: string;
  description?: string;
  onBack?: () => void;
  children: React.ReactNode;
}

export function ResponsiveDialog({
  isOpen,
  setIsOpen,
  title,
  description,
  onBack,
  children,
}: DrawerDialogProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const hasHeader = Boolean(title || description || onBack);

  if (isDesktop) {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="bg-theme-bg text-theme-text border-theme-border [&_[data-slot=dialog-close]]:border-theme-border [&_[data-slot=dialog-close]]:bg-theme-card-raised grid max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)] overflow-hidden p-0 outline-hidden sm:max-w-md [&_[data-slot=dialog-close]]:border [&_[data-slot=dialog-close]]:shadow-sm">
          {hasHeader && (
            <div className="flex items-start gap-3 px-5 pt-5 pr-14">
              {onBack && <BackButton onClick={onBack} />}
              {(title || description) && (
                <DialogHeader className="min-w-0 flex-1">
                  {title && <DialogTitle>{title}</DialogTitle>}
                  {description && <DialogDescription>{description}</DialogDescription>}
                </DialogHeader>
              )}
            </div>
          )}
          <div
            className={cn(
              "min-h-0 overflow-y-auto overscroll-contain px-5 pb-5",
              hasHeader ? "pt-5" : "pt-14",
            )}
          >
            {children}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer
      open={isOpen}
      onOpenChange={setIsOpen}
      shouldScaleBackground={false}
      repositionInputs={false}
      direction="bottom"
    >
      <DrawerContent className="bg-theme-bg pb-safe border-theme-border text-theme-text border-t outline-hidden">
        {hasHeader && (
          <DrawerHeader className="text-left">
            <div className="flex items-start gap-3">
              {onBack && <BackButton onClick={onBack} />}
              {(title || description) && (
                <div className="min-w-0 flex-1">
                  {title && <DrawerTitle>{title}</DrawerTitle>}
                  {description && <DrawerDescription>{description}</DrawerDescription>}
                </div>
              )}
            </div>
          </DrawerHeader>
        )}
        <div className="max-h-[75dvh] overflow-y-auto p-6">{children}</div>
      </DrawerContent>
    </Drawer>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={onClick}
      className="text-theme-muted hover:text-theme-text shrink-0"
      aria-label="Wróć"
    >
      <ArrowLeft size={19} />
    </Button>
  );
}
