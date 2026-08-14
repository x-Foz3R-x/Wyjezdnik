"use client";

import { ChoiceCard } from "~/components/ui/choice-card";

export function FinanceModeOption({
  selected,
  disabled = false,
  title,
  description,
  badge,
  onSelect,
}: {
  selected: boolean;
  disabled?: boolean;
  title: string;
  description: string;
  badge?: string;
  onSelect: () => void;
}) {
  return (
    <ChoiceCard
      onClick={onSelect}
      disabled={disabled}
      selected={selected}
      title={title}
      description={description}
      badge={badge}
    />
  );
}
