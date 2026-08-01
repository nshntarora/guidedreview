import type { DiffLine } from "../../../lib/types";
import type { DiffSide } from "../commentTypes";

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
