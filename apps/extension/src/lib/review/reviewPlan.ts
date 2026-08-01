import type { DiffFile, FileRole, ReviewUnit, ReviewUnitFileRef } from "../types";
import { DEFAULT_FILE_ROLE, FILE_ROLES } from "../types";
import { isTestPath } from "./pathClass";

const KNOWN_FILE_ROLES: ReadonlySet<string> = new Set(FILE_ROLES);

/** Role rank for within-unit sort (lower first). */
const ROLE_RANK: Record<FileRole, number> = {
  schema_or_model: 0,
  core_logic: 1,
  consumer_or_call_site: 2,
  test: 3,
  config_or_generated: 4,
};

/**
 * Namespace a unit id by chunk index so units from different `chunkDiffByFile`
 * chunks never collide when stitched into one plan.
 */
export function prefixChunkUnitId(chunkIndex: number, unitId: string): string {
  return `c${chunkIndex}-${unitId}`;
}

function sortFileRefs(files: ReviewUnitFileRef[]): ReviewUnitFileRef[] {
  return [...files].sort((a, b) => {
    const rank = ROLE_RANK[a.role] - ROLE_RANK[b.role];
    if (rank !== 0) return rank;
    return a.fileId < b.fileId ? -1 : a.fileId > b.fileId ? 1 : 0;
  });
}

function testsUnitId(baseId: string): string {
  if (baseId.endsWith("-tests")) return `${baseId}-files`;
  return `${baseId}-tests`;
}

function testsTitle(changeTitle: string): string {
  const trimmed = changeTitle.trim();
  if (!trimmed) return "Tests";
  if (/^tests\b/i.test(trimmed)) return trimmed;
  return `Tests for ${trimmed}`;
}

/**
 * Turn one raw object from the model's streamed JSON into review units, and
 * enforce purity: no mixed production+test units. Returns zero, one, or two
 * units (change then tests when a mixed unit is split).
 *
 * Shape and content are checked in one pass. Partial JSON and malformed
 * objects must never reach the UI, so a unit missing any required field is
 * dropped whole (`kind` is optional — it is defaulted here, so streaming
 * property order cannot drop a unit). Then: the LLM plans structure and writes
 * commentary, but the code shown to the reviewer always comes from the real
 * diff, so every fileId/hunkId it referenced is checked against the diff it was
 * given and anything invented is dropped.
 *
 * Never mutates `value`.
 */
export function parseReviewUnit(value: unknown, knownFiles: Map<string, DiffFile>): ReviewUnit[] {
  if (!value || typeof value !== "object") return [];
  const unit = value as Record<string, unknown>;

  if (typeof unit.id !== "string" || unit.id.length === 0) return [];
  if (typeof unit.title !== "string") return [];
  if (typeof unit.context !== "string") return [];
  if (!Array.isArray(unit.files)) return [];
  if (unit.kind !== undefined && typeof unit.kind !== "string") return [];

  const files: ReviewUnitFileRef[] = [];

  for (const raw of unit.files) {
    if (!raw || typeof raw !== "object") return [];
    const ref = raw as Record<string, unknown>;
    if (typeof ref.fileId !== "string") return [];
    if (!Array.isArray(ref.hunkIds) || !ref.hunkIds.every((id) => typeof id === "string")) {
      return [];
    }
    if (typeof ref.role !== "string") return [];

    const file = knownFiles.get(ref.fileId);
    if (!file) continue;

    // Empty hunkIds means "whole file". If the model listed only invalid ids,
    // treat the ref as whole-file rather than dropping a real file path —
    // better to show more of a real file than hide a unit step.
    const rawHunkIds = ref.hunkIds as string[];
    const hunkIds =
      rawHunkIds.length === 0 ? [] : rawHunkIds.filter((id) => file.hunks.some((h) => h.id === id));

    // Path class wins for test files so purity splits are deterministic.
    let role: FileRole = KNOWN_FILE_ROLES.has(ref.role)
      ? (ref.role as FileRole)
      : DEFAULT_FILE_ROLE;
    if (isTestPath(ref.fileId)) role = "test";

    files.push({
      fileId: ref.fileId,
      hunkIds,
      role,
    });
  }

  if (files.length === 0) return [];

  const testFiles = sortFileRefs(files.filter((f) => f.role === "test"));
  const otherFiles = sortFileRefs(files.filter((f) => f.role !== "test"));

  // Pure tests.
  if (otherFiles.length === 0) {
    return [
      {
        id: unit.id,
        title: unit.title,
        context: unit.context,
        kind: "tests",
        files: testFiles,
      },
    ];
  }

  // Pure change (production + optional config).
  if (testFiles.length === 0) {
    return [
      {
        id: unit.id,
        title: unit.title,
        context: unit.context,
        kind: "change",
        files: otherFiles,
      },
    ];
  }

  // Mixed — always split: change first, then tests immediately after.
  const changeTitle = unit.title;
  return [
    {
      id: unit.id,
      title: changeTitle,
      context: unit.context,
      kind: "change",
      files: otherFiles,
    },
    {
      id: testsUnitId(unit.id),
      title: testsTitle(changeTitle),
      context: unit.context,
      kind: "tests",
      files: testFiles,
    },
  ];
}

/**
 * Drop hunk ids already claimed by earlier units (first occurrence wins).
 * Whole-file refs (`hunkIds: []`) claim every hunk on that file.
 * Returns null when nothing remains after stripping.
 */
export function stripDuplicateHunks(
  unit: ReviewUnit,
  knownFiles: Map<string, DiffFile>,
  seenHunkIds: Set<string>,
): ReviewUnit | null {
  const files: ReviewUnitFileRef[] = [];

  for (const ref of unit.files) {
    const file = knownFiles.get(ref.fileId);
    if (!file) continue;

    const candidateIds = ref.hunkIds.length === 0 ? file.hunks.map((h) => h.id) : ref.hunkIds;

    if (candidateIds.length === 0) {
      // Binary/elided or empty file — keep once via a synthetic claim key.
      const claimKey = `${ref.fileId}#*`;
      if (seenHunkIds.has(claimKey)) continue;
      seenHunkIds.add(claimKey);
      files.push(ref);
      continue;
    }

    const kept = candidateIds.filter((id) => !seenHunkIds.has(id));
    if (kept.length === 0) continue;

    for (const id of kept) seenHunkIds.add(id);

    // If we kept every original candidate, preserve whole-file empty list.
    const wasWholeFile = ref.hunkIds.length === 0;
    const keptAll = wasWholeFile && kept.length === file.hunks.length;
    files.push({
      fileId: ref.fileId,
      hunkIds: keptAll ? [] : kept,
      role: ref.role,
    });
  }

  if (files.length === 0) return null;
  return { ...unit, files: sortFileRefs(files) };
}
