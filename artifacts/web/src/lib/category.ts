export const CATEGORY_VALUES = [
  "OWNERSHIP_TRANSFER",
  "PERCENTAGE_CHANGE",
  "NEW_BENEFICIAL_OWNER",
  "REMOVAL_OF_BENEFICIAL_OWNER",
  "CORRECTION_AMENDMENT",
] as const;

export type CategoryValue = typeof CATEGORY_VALUES[number];

export const CATEGORY_LABELS: Record<CategoryValue, string> = {
  OWNERSHIP_TRANSFER: "Ownership Transfer",
  PERCENTAGE_CHANGE: "Percentage Change",
  NEW_BENEFICIAL_OWNER: "New Beneficial Owner",
  REMOVAL_OF_BENEFICIAL_OWNER: "Removal of Beneficial Owner",
  CORRECTION_AMENDMENT: "Correction / Amendment",
};

export function getCategoryLabel(value: string): string {
  return CATEGORY_LABELS[value as CategoryValue] ?? value;
}
