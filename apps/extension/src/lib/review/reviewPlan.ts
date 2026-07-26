import type { DiffFile, ReviewUnit, ReviewUnitFileRef } from "../types";
import { DEFAULT_FILE_ROLE, FILE_ROLES } from "../types";

const KNOWN_FILE_ROLES: ReadonlySet<string> = new Set(FILE_ROLES);

/**
 * Namespace a unit id by chunk index so units from different `chunkDiffByFile`
 * chunks never collide when stitched into one plan.
 */
export function prefixChunkUnitId(chunkIndex: number, unitId: string): string {
  return `c${chunkIndex}-${unitId}`;
}

/**
 * Validate a single review unit against the real diff. Returns null when
 * nothing real remains (all file refs hallucinated) so callers can drop it.
 *
 * The LLM plans structure and writes commentary, but the actual code shown to
 * the reviewer must always come from the real diff. Every fileId/hunkId the
 * model referenced is checked against the diff it was given, and anything that
 * doesn't exist is dropped rather than trusted — a model that hallucinates a
 * file path should never surface as a broken or misleading step in the UI.
 *
 * Mutates hunk id lists on a shallow copy of the unit's file refs only —
 * never mutates the caller's original unit.
 */
export function validateAndCleanUnit(
  unit: ReviewUnit,
  knownFiles: Map<string, DiffFile>,
): ReviewUnit | null {
  const files: ReviewUnitFileRef[] = [];

  for (const ref of unit.files) {
    const file = knownFiles.get(ref.fileId);
    if (!file) continue;

    // Empty hunkIds means "whole file". If the model listed only invalid ids,
    // treat the ref as whole-file rather than dropping a real file path —
    // better to show more of a real file than hide a unit step.
    const hunkIds =
      ref.hunkIds.length === 0
        ? []
        : ref.hunkIds.filter((id) => file.hunks.some((h) => h.id === id));

    files.push({
      fileId: ref.fileId,
      hunkIds,
      role: KNOWN_FILE_ROLES.has(ref.role) ? ref.role : DEFAULT_FILE_ROLE,
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
