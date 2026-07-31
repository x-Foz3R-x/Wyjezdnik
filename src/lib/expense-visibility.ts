export type ExpenseVisibility = "everyone" | "managers" | "selected";

export function parseExpenseVisibility(value: unknown): ExpenseVisibility {
  return value === "managers" || value === "selected" || value === "everyone" ? value : "everyone";
}

export function canViewAllTripExpenses({
  visibility,
  viewerIds,
  userId,
  isAdmin,
}: {
  visibility: ExpenseVisibility;
  viewerIds: string[];
  userId: string;
  isAdmin: boolean;
}) {
  return (
    isAdmin ||
    visibility === "everyone" ||
    (visibility === "selected" && viewerIds.includes(userId))
  );
}
