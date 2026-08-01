import type { ReviewPlan } from "../../../lib/types";
import { buildDisplayUnits } from "../displayUnits";

/**
 * Find the display-unit index that owns a file (and optionally a specific hunk).
 * Skips the synthetic PR description unit (index 0).
 *
 * Preference order:
 * 1. First review unit that references both `filePath` and `hunkId` (when given)
 * 2. First review unit that references `filePath` (any hunks / whole file)
 * 3. `null` if no unit mentions the file
 */
export function findUnitForFile(
  plan: ReviewPlan | null,
  filePath: string,
  hunkId?: string,
): number | null {
  if (!plan) return null;

  const displayUnits = buildDisplayUnits(plan);

  if (hunkId) {
    for (let i = 0; i < displayUnits.length; i++) {
      const unit = displayUnits[i];
      if (unit.kind !== "review") continue;
      const hit = unit.unit.files.some(
        (ref) =>
          ref.fileId === filePath && (ref.hunkIds.length === 0 || ref.hunkIds.includes(hunkId)),
      );
      if (hit) return i;
    }
  }

  for (let i = 0; i < displayUnits.length; i++) {
    const unit = displayUnits[i];
    if (unit.kind !== "review") continue;
    if (unit.unit.files.some((ref) => ref.fileId === filePath)) return i;
  }

  return null;
}
