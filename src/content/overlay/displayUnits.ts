import type { ReviewPlan, ReviewUnit } from "../../lib/types";

export const PR_DESCRIPTION_UNIT_ID = "__pr_description";
export const PR_DESCRIPTION_UNIT_TITLE = "PR Description";

export type DisplayUnit =
  | { kind: "pr_description"; id: typeof PR_DESCRIPTION_UNIT_ID; title: typeof PR_DESCRIPTION_UNIT_TITLE }
  | { kind: "review"; id: string; title: string; unit: ReviewUnit; planIndex: number };

/**
 * Build the ordered list of units shown in the overlay: a synthetic PR
 * description unit first, then any LLM-generated review units. The description
 * unit is UI-only — it never comes from the model and is never validated
 * against the diff.
 */
export function buildDisplayUnits(plan: ReviewPlan | null): DisplayUnit[] {
  const description: DisplayUnit = {
    kind: "pr_description",
    id: PR_DESCRIPTION_UNIT_ID,
    title: PR_DESCRIPTION_UNIT_TITLE,
  };

  if (!plan) return [description];

  return [
    description,
    ...plan.units.map(
      (unit, planIndex): DisplayUnit => ({
        kind: "review",
        id: unit.id,
        title: unit.title,
        unit,
        planIndex,
      }),
    ),
  ];
}

/** Number of navigable display units (always at least 1 for the description). */
export function displayUnitCount(plan: ReviewPlan | null): number {
  return 1 + (plan?.units.length ?? 0);
}
