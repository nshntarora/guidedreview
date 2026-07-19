import type { ParsedDiff, ReviewPlan, ReviewUnit } from "../types";

/**
 * The LLM plans structure and writes commentary, but the actual code shown
 * to the reviewer must always come from the real diff. This validates every
 * fileId/hunkId the model referenced against the diff it was given, dropping
 * (rather than trusting) anything that doesn't exist — a model that
 * hallucinates a file path should never surface as a broken or misleading
 * step in the UI.
 */
export function validateAndCleanPlan(plan: ReviewPlan, diff: ParsedDiff): ReviewPlan {
  const knownFiles = new Map(diff.files.map((f) => [f.path, f]));

  const cleanedUnits: ReviewUnit[] = [];

  for (const unit of plan.units) {
    const files = unit.files.filter((ref) => {
      const file = knownFiles.get(ref.fileId);
      if (!file) return false;
      if (ref.hunkIds.length === 0) return true;
      const validHunkIds = new Set(file.hunks.map((h) => h.id));
      ref.hunkIds = ref.hunkIds.filter((id) => validHunkIds.has(id));
      return true;
    });

    if (files.length === 0) continue; // nothing real left in this unit — drop it

    cleanedUnits.push({ ...unit, files });
  }

  return { units: cleanedUnits };
}

/**
 * Stitch together per-chunk plans (from `chunkDiffByFile`) into one plan,
 * namespacing ids per chunk so units from different chunks never collide.
 */
export function mergePlans(plans: ReviewPlan[]): ReviewPlan {
  const units: ReviewUnit[] = [];

  plans.forEach((plan, chunkIndex) => {
    const prefix = `c${chunkIndex}-`;

    for (const unit of plan.units) {
      units.push({ ...unit, id: `${prefix}${unit.id}` });
    }
  });

  return { units };
}
