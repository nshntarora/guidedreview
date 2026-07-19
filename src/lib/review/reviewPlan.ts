import type { FileRole, ParsedDiff, ReviewPlan, ReviewUnit, ReviewUnitFileRef } from "../types";

const FILE_ROLES: ReadonlySet<string> = new Set([
  "schema_or_model",
  "core_logic",
  "consumer_or_call_site",
  "test",
  "config_or_generated",
]);

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
    const cleaned = validateAndCleanUnit(unit, knownFiles);
    if (cleaned) cleanedUnits.push(cleaned);
  }

  return { units: cleanedUnits };
}

/**
 * Validate a single review unit against the real diff. Returns null when
 * nothing real remains (all file refs hallucinated) so callers can drop it.
 *
 * Mutates hunk id lists on a shallow copy of the unit's file refs only —
 * never mutates the caller's original unit.
 */
export function validateAndCleanUnit(
  unit: ReviewUnit,
  diffOrKnownFiles: ParsedDiff | Map<string, ParsedDiff["files"][number]>,
): ReviewUnit | null {
  const knownFiles =
    diffOrKnownFiles instanceof Map
      ? diffOrKnownFiles
      : new Map(diffOrKnownFiles.files.map((f) => [f.path, f]));

  const files: ReviewUnitFileRef[] = [];

  for (const ref of unit.files) {
    const file = knownFiles.get(ref.fileId);
    if (!file) continue;

    const hunkIds =
      ref.hunkIds.length === 0
        ? []
        : ref.hunkIds.filter((id) => file.hunks.some((h) => h.id === id));

    files.push({
      fileId: ref.fileId,
      hunkIds,
      role: FILE_ROLES.has(ref.role) ? (ref.role as FileRole) : "core_logic",
    });
  }

  if (files.length === 0) return null;

  return {
    id: unit.id,
    title: unit.title,
    context: unit.context,
    files,
  };
}

/**
 * Lightweight structural check for a raw parsed unit before validation.
 * Incomplete or malformed objects from partial JSON must never reach the UI.
 */
export function isCompleteReviewUnit(value: unknown): value is ReviewUnit {
  if (!value || typeof value !== "object") return false;
  const u = value as Record<string, unknown>;
  if (typeof u.id !== "string" || u.id.length === 0) return false;
  if (typeof u.title !== "string") return false;
  if (typeof u.context !== "string") return false;
  if (!Array.isArray(u.files)) return false;

  for (const file of u.files) {
    if (!file || typeof file !== "object") return false;
    const f = file as Record<string, unknown>;
    if (typeof f.fileId !== "string") return false;
    if (!Array.isArray(f.hunkIds) || !f.hunkIds.every((id) => typeof id === "string")) return false;
    if (typeof f.role !== "string") return false;
  }

  return true;
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
