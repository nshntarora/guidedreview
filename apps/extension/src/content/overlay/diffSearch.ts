/**
 * In-overlay diff search: index the parsed PR diff, fuzzy-search with Fuse,
 * highlight matches, and map hits back to display units.
 */
import Fuse, { type IFuseOptions } from "fuse.js";
import type { DiffLine, ParsedDiff, ReviewPlan } from "../../lib/types";
import type { DiffSide } from "./commentTypes";
import { buildDisplayUnits } from "./store";

// ---- Types ------------------------------------------------------------------

/** One searchable document derived from the parsed PR diff. */
export type DiffSearchDoc =
  | {
      kind: "file";
      /** Stable id: `file:${path}` */
      id: string;
      /** Path string Fuse matches against (includes previousPath on renames). */
      path: string;
      /** Always empty for file docs — keeps Fuse multi-field config uniform. */
      content: string;
      filePath: string;
      previousPath?: string;
    }
  | {
      kind: "line";
      /** Same id the DOM uses: `${hunkId}:${lineIndex}:${side}` */
      id: string;
      path: string;
      content: string;
      filePath: string;
      hunkId: string;
      lineIndex: number;
      side: DiffSide;
      lineType: DiffLine["type"];
    };

/** Inclusive character ranges for a single Fuse-matched field. */
export type MatchRange = readonly [number, number];

/** A ranked hit returned by `searchDiff`. */
export type DiffSearchResult = DiffSearchDoc & {
  /** Fuse score (lower is better). Present for debugging / stable sort. */
  score: number;
  /**
   * Match ranges from Fuse `includeMatches`, keyed by field. Used to paint
   * brand highlights on the path / content in the result list.
   */
  matches?: {
    path?: MatchRange[];
    content?: MatchRange[];
  };
};

/** Target to scroll/highlight after navigating from a search result. */
export interface SearchScrollTarget {
  filePath: string;
  /** Line DOM id when the hit was a line match. */
  lineId?: string;
}

/** One row in a line-result preview (match ± context). */
export interface PreviewLine {
  lineIndex: number;
  content: string;
  lineType: DiffLine["type"];
  /** True for the hit line itself (not surrounding context). */
  isMatch: boolean;
}

export type HighlightSegment = { text: string; highlight: boolean };

// ---- Index ------------------------------------------------------------------

function sideForLineType(type: "add" | "del" | "context"): "LEFT" | "RIGHT" {
  return type === "del" ? "LEFT" : "RIGHT";
}

/**
 * Flatten a parsed PR diff into Fuse-ready documents: one per file path and
 * one per hunk line. Binary/elided files contribute path docs only.
 */
export function buildDiffSearchIndex(diff: ParsedDiff): DiffSearchDoc[] {
  const docs: DiffSearchDoc[] = [];

  for (const file of diff.files) {
    // Include previousPath in the searchable path string so renames hit on either name.
    const pathSearch = file.previousPath ? `${file.previousPath} ${file.path}` : file.path;

    docs.push({
      kind: "file",
      id: `file:${file.path}`,
      path: pathSearch,
      content: "",
      filePath: file.path,
      previousPath: file.previousPath,
    });

    if (file.isBinaryOrElided) continue;

    for (const hunk of file.hunks) {
      hunk.lines.forEach((line, lineIndex) => {
        const side = sideForLineType(line.type);
        docs.push({
          kind: "line",
          id: `${hunk.id}:${lineIndex}:${side}`,
          path: file.path,
          content: line.content,
          filePath: file.path,
          hunkId: hunk.id,
          lineIndex,
          side,
          lineType: line.type,
        });
      });
    }
  }

  return docs;
}

// ---- Search -----------------------------------------------------------------

const DEFAULT_LIMIT = 50;

/** Fuse options tuned for code: path weighted above content; moderate fuzziness. */
const FUSE_OPTIONS: IFuseOptions<DiffSearchDoc> = {
  keys: [
    { name: "path", weight: 0.7 },
    { name: "content", weight: 0.3 },
  ],
  threshold: 0.35,
  ignoreLocation: true,
  includeScore: true,
  includeMatches: true,
  minMatchCharLength: 1,
};

/**
 * Search the pre-built index. Empty / whitespace-only queries return [].
 * File-path hits are always ordered before line hits; within each group, Fuse
 * score (lower is better) decides order.
 */
export function searchDiff(
  docs: DiffSearchDoc[],
  query: string,
  limit = DEFAULT_LIMIT,
): DiffSearchResult[] {
  const q = query.trim();
  if (!q || docs.length === 0) return [];

  const fuse = new Fuse(docs, FUSE_OPTIONS);
  const raw = fuse.search(q, { limit: Math.max(limit * 2, limit) });

  const results: DiffSearchResult[] = raw.map((hit) => {
    const matches: NonNullable<DiffSearchResult["matches"]> = {};
    for (const m of hit.matches ?? []) {
      if (m.key !== "path" && m.key !== "content") continue;
      const ranges: MatchRange[] = [...(m.indices ?? [])];
      if (ranges.length === 0) continue;
      const existing = matches[m.key] ?? [];
      matches[m.key] = existing.concat(ranges);
    }
    return {
      ...hit.item,
      score: hit.score ?? 1,
      matches: Object.keys(matches).length > 0 ? matches : undefined,
    };
  });

  results.sort((a, b) => {
    // File matches always rank above line matches.
    if (a.kind !== b.kind) {
      return a.kind === "file" ? -1 : 1;
    }
    if (a.score !== b.score) return a.score - b.score;
    // Stable tie-break: path then line index for line hits.
    const pathCmp = a.filePath.localeCompare(b.filePath);
    if (pathCmp !== 0) return pathCmp;
    if (a.kind === "line" && b.kind === "line") {
      return a.lineIndex - b.lineIndex;
    }
    return 0;
  });

  return results.slice(0, limit);
}

// ---- Unit lookup ------------------------------------------------------------

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

// ---- Line preview -----------------------------------------------------------

/**
 * Collect up to `context` lines above and below a line hit within the same hunk.
 * Context is clamped to the hunk boundary.
 */
export function buildLinePreview(
  docs: DiffSearchDoc[],
  result: Extract<DiffSearchResult, { kind: "line" }>,
  context = 2,
): PreviewLine[] {
  const hunkLines = docs
    .filter(
      (d): d is Extract<DiffSearchDoc, { kind: "line" }> =>
        d.kind === "line" && d.hunkId === result.hunkId,
    )
    .sort((a, b) => a.lineIndex - b.lineIndex);

  if (hunkLines.length === 0) {
    return [
      {
        lineIndex: result.lineIndex,
        content: result.content,
        lineType: result.lineType,
        isMatch: true,
      },
    ];
  }

  const min = Math.max(0, result.lineIndex - context);
  const max = result.lineIndex + context;

  return hunkLines
    .filter((l) => l.lineIndex >= min && l.lineIndex <= max)
    .map((l) => ({
      lineIndex: l.lineIndex,
      content: l.content,
      lineType: l.lineType,
      isMatch: l.lineIndex === result.lineIndex,
    }));
}

// ---- Match highlighting -----------------------------------------------------

/**
 * Split `text` into plain / highlighted segments using inclusive index ranges
 * from Fuse (`includeMatches`). Overlapping ranges are merged.
 */
export function highlightSegments(
  text: string,
  ranges: ReadonlyArray<readonly [number, number]> | undefined,
): HighlightSegment[] {
  if (!text) return [];
  if (!ranges?.length) return [{ text, highlight: false }];

  const merged = mergeRanges(ranges, text.length);
  if (merged.length === 0) return [{ text, highlight: false }];

  const segments: HighlightSegment[] = [];
  let cursor = 0;
  for (const [start, end] of merged) {
    // Fuse indices are inclusive on both ends.
    const from = Math.max(0, start);
    const to = Math.min(text.length, end + 1);
    if (from > cursor) {
      segments.push({ text: text.slice(cursor, from), highlight: false });
    }
    if (to > from) {
      segments.push({ text: text.slice(from, to), highlight: true });
    }
    cursor = Math.max(cursor, to);
  }
  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), highlight: false });
  }
  return segments;
}

/**
 * Fallback when Fuse did not return ranges: case-insensitive substring of the
 * raw query (first occurrence). Returns empty when the query is blank or absent.
 */
export function fallbackMatchRanges(text: string, query: string): Array<[number, number]> {
  const q = query.trim();
  if (!q || !text) return [];
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx < 0) return [];
  return [[idx, idx + q.length - 1]];
}

function mergeRanges(
  ranges: ReadonlyArray<readonly [number, number]>,
  textLength: number,
): Array<[number, number]> {
  const sorted = ranges
    .map(([a, b]) => {
      const start = Math.min(a, b);
      const end = Math.max(a, b);
      return [Math.max(0, start), Math.min(textLength - 1, end)] as [number, number];
    })
    .filter(([start, end]) => start <= end && textLength > 0)
    .sort((x, y) => x[0] - y[0] || x[1] - y[1]);

  if (sorted.length === 0) return [];

  const out: Array<[number, number]> = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const [s, e] = sorted[i];
    const last = out[out.length - 1];
    if (s <= last[1] + 1) {
      last[1] = Math.max(last[1], e);
    } else {
      out.push([s, e]);
    }
  }
  return out;
}
