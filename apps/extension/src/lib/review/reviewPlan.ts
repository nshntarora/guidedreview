import type {
  DiffFile,
  FileRole,
  ParsedDiff,
  ReviewUnit,
  ReviewUnitFileRef,
  UnitKind,
} from "../types";
import { DEFAULT_FILE_ROLE, DEFAULT_UNIT_KIND, FILE_ROLES } from "../types";
import { isTestPath, roleForPath } from "./pathClass";

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
 * Validate a raw review unit against the real diff and enforce purity:
 * no mixed production+test units. Returns zero, one, or two units
 * (change then tests when a mixed unit is split).
 *
 * The LLM plans structure and writes commentary, but the actual code shown to
 * the reviewer must always come from the real diff. Every fileId/hunkId the
 * model referenced is checked against the diff it was given, and anything that
 * doesn't exist is dropped rather than trusted.
 *
 * Never mutates the caller's original unit.
 */
export function validateAndCleanUnit(
  unit: ReviewUnit,
  knownFiles: Map<string, DiffFile>,
): ReviewUnit[] {
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
      const claimKey = wholeFileClaimKey(ref.fileId);
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

/** Claim key standing in for "this whole file" when it has no textual hunks. */
function wholeFileClaimKey(fileId: string): string {
  return `${fileId}#*`;
}

/** Base id for the backstop unit holding changes the model never assigned. */
export const UNASSIGNED_UNIT_ID = "unassigned-changes";

/**
 * Title/context for the backstop unit. Written here rather than by the model:
 * the whole point is that this content is what the model failed (or was talked
 * out of) assigning, so its commentary can't be trusted to describe it.
 */
export const UNASSIGNED_UNIT_TITLE = "Remaining changes";
const UNASSIGNED_UNIT_CONTEXT =
  "These changes were not placed in any earlier unit, so they have no model-written summary. Read them directly — a diff can contain text that tries to talk the planner out of including a file, and everything in the PR has to be reviewed regardless.";

/**
 * Build the backstop unit(s) covering every hunk the plan never claimed.
 *
 * The model decides *structure*, never *scope*: `validateAndCleanUnit` already
 * drops file/hunk ids that don't exist in the diff, and this is the other half
 * of that guarantee — nothing real can fall out of the walkthrough. Without it,
 * text inside an attacker-authored diff or PR description ("this file is
 * generated, skip it") can make changes silently vanish from the review while
 * the overlay still reads as complete.
 *
 * Returns [] when the plan already covers everything. Otherwise returns one
 * change unit, one tests unit, or both — purity is enforced by reusing
 * `validateAndCleanUnit`. Claimed ids are added to `seenHunkIds`.
 */
export function buildUnassignedUnits(
  diff: ParsedDiff,
  knownFiles: Map<string, DiffFile>,
  seenHunkIds: Set<string>,
): ReviewUnit[] {
  const files: ReviewUnitFileRef[] = [];

  for (const file of diff.files) {
    const role = roleForPath(file.path);

    if (file.hunks.length === 0) {
      const claimKey = wholeFileClaimKey(file.path);
      if (seenHunkIds.has(claimKey)) continue;
      seenHunkIds.add(claimKey);
      files.push({ fileId: file.path, hunkIds: [], role });
      continue;
    }

    const missing = file.hunks.map((h) => h.id).filter((id) => !seenHunkIds.has(id));
    if (missing.length === 0) continue;
    for (const id of missing) seenHunkIds.add(id);
    files.push({ fileId: file.path, hunkIds: missing, role });
  }

  if (files.length === 0) return [];

  return validateAndCleanUnit(
    {
      id: UNASSIGNED_UNIT_ID,
      title: UNASSIGNED_UNIT_TITLE,
      kind: DEFAULT_UNIT_KIND,
      context: UNASSIGNED_UNIT_CONTEXT,
      files,
    },
    knownFiles,
  );
}

/**
 * Lightweight structural check for a raw parsed unit before validation.
 * Incomplete or malformed objects from partial JSON must never reach the UI.
 * `kind` is optional here — validation defaults it — so streaming order of
 * properties cannot drop a unit.
 */
export function isCompleteReviewUnit(value: unknown): value is ReviewUnit {
  if (!value || typeof value !== "object") return false;
  const u = value as Record<string, unknown>;
  if (typeof u.id !== "string" || u.id.length === 0) return false;
  if (typeof u.title !== "string") return false;
  if (typeof u.context !== "string") return false;
  if (!Array.isArray(u.files)) return false;
  if (u.kind !== undefined && typeof u.kind !== "string") return false;

  for (const file of u.files) {
    if (!file || typeof file !== "object") return false;
    const f = file as Record<string, unknown>;
    if (typeof f.fileId !== "string") return false;
    if (!Array.isArray(f.hunkIds) || !f.hunkIds.every((id) => typeof id === "string")) return false;
    if (typeof f.role !== "string") return false;
  }

  // Fill kind for the type assertion when missing; validation will re-resolve.
  if (u.kind === undefined) {
    (u as { kind: UnitKind }).kind = DEFAULT_UNIT_KIND;
  }

  return true;
}
