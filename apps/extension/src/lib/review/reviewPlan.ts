import type { DiffFile, FileRole, ReviewUnit, ReviewUnitFileRef } from "../types";
import { DEFAULT_FILE_ROLE, FILE_ROLES } from "../types";

const KNOWN_FILE_ROLES: ReadonlySet<string> = new Set(FILE_ROLES);

/**
 * Turn one raw object from the model's streamed JSON into a review unit, or
 * null if nothing trustworthy remains.
 *
 * Two things are checked in one pass. First the shape: partial JSON and
 * malformed objects must never reach the UI, so a unit missing any required
 * field is dropped whole. Then the content: the LLM plans structure and writes
 * commentary, but the code shown to the reviewer always comes from the real
 * diff, so every fileId/hunkId it referenced is checked against the diff it was
 * given and anything invented is dropped. A model that hallucinates a file path
 * should never surface as a broken or misleading step.
 *
 * Never mutates `value`.
 */
export function parseReviewUnit(
  value: unknown,
  knownFiles: Map<string, DiffFile>,
): ReviewUnit | null {
  if (!value || typeof value !== "object") return null;
  const unit = value as Record<string, unknown>;

  if (typeof unit.id !== "string" || unit.id.length === 0) return null;
  if (typeof unit.title !== "string") return null;
  if (typeof unit.context !== "string") return null;
  if (!Array.isArray(unit.files)) return null;

  const files: ReviewUnitFileRef[] = [];

  for (const raw of unit.files) {
    if (!raw || typeof raw !== "object") return null;
    const ref = raw as Record<string, unknown>;
    if (typeof ref.fileId !== "string") return null;
    if (!Array.isArray(ref.hunkIds) || !ref.hunkIds.every((id) => typeof id === "string")) {
      return null;
    }
    if (typeof ref.role !== "string") return null;

    const file = knownFiles.get(ref.fileId);
    if (!file) continue;

    const hunkIds = ref.hunkIds as string[];
    files.push({
      fileId: ref.fileId,
      // Empty hunkIds means "whole file". If the model listed only invalid ids,
      // treat the ref as whole-file rather than dropping a real file path —
      // better to show more of a real file than hide a unit step.
      hunkIds: hunkIds.filter((id) => file.hunks.some((h) => h.id === id)),
      role: KNOWN_FILE_ROLES.has(ref.role) ? (ref.role as FileRole) : DEFAULT_FILE_ROLE,
    });
  }

  if (files.length === 0) return null;

  return { id: unit.id, title: unit.title, context: unit.context, files };
}
