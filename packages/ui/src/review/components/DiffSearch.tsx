import { useMemo, type ReactNode } from "react";
import { cn } from "@guided-review/ui";
import { summarizeDiff } from "@guided-review/core";
import { FileIcon } from "./FileIcon";
import { DiffStatCounts } from "./DiffStatCounts";
import { useCommandAction } from "@guided-review/ui/review/commandPalette";
import {
  buildDiffSearchIndex,
  buildLinePreview,
  fallbackMatchRanges,
  highlightSegments,
  searchDiff,
  type DiffSearchResult,
  type MatchRange,
} from "@guided-review/ui/review/diffSearch";
import type { ParsedDiff } from "@guided-review/ui/review/types";

function linePrefix(type: "add" | "del" | "context"): string {
  if (type === "add") return "+";
  if (type === "del") return "−";
  return " ";
}

/** Register diff search with the layout's palette, reusing the full diff index and ranking. */
export function DiffSearch({
  diff,
  onSelect,
}: {
  diff: ParsedDiff | null;
  onSelect: (result: DiffSearchResult) => void;
}) {
  const docs = useMemo(() => (diff ? buildDiffSearchIndex(diff) : []), [diff]);
  const fileStats = useMemo(
    () => new Map(diff ? summarizeDiff(diff).fileSummaries.map((file) => [file.path, file]) : []),
    [diff],
  );
  useCommandAction({
    id: "search",
    label: "Search files and code",
    keywords: "find fuzzy paths diff",
    shortcut: ["mod", "F"],
    placeholder: "Search files and code…",
    emptyMessage: docs.length
      ? "Type a file name or code to search the whole diff."
      : "No changed files to search yet.",
    results: (query) =>
      searchDiff(docs, query).map((result) => {
        const file = fileStats.get(result.filePath);
        return {
          id: result.id,
          label: result.filePath,
          testId: result.kind === "file" ? "diff-search-result-file" : "diff-search-result-line",
          onSelect: () => onSelect(result),
          content: (
            <>
              <div className="flex min-w-0 items-center gap-2.5">
                <FileIcon path={result.filePath} />
                <div
                  className="min-w-0 flex-1 truncate font-mono text-base text-foreground"
                  title={result.filePath}
                >
                  <HighlightedText
                    text={result.filePath}
                    ranges={rangesForField(result, "path", result.filePath, query)}
                  />
                </div>
                {file && (
                  <span className="flex shrink-0 items-center gap-2.5 whitespace-nowrap font-mono text-xs">
                    <span
                      title={file.status}
                      aria-label={file.status}
                      className={cn(
                        file.status === "added"
                          ? "text-diff-add"
                          : file.status === "removed"
                            ? "text-diff-del"
                            : file.status === "modified"
                              ? "text-warning"
                              : "text-syntax-entity",
                      )}
                    >
                      {file.status === "modified"
                        ? "M"
                        : file.status === "removed"
                          ? "D"
                          : file.status === "renamed"
                            ? "R"
                            : "A"}
                    </span>
                    {file.isBinaryOrElided ? (
                      <span className="text-muted">binary</span>
                    ) : (
                      <DiffStatCounts additions={file.additions} deletions={file.deletions} />
                    )}
                  </span>
                )}
              </div>
              {result.kind === "file" ? (
                <div className="mt-1 text-sm text-muted">File name match</div>
              ) : (
                <LineResultPreview result={result} docs={docs} query={query} />
              )}
            </>
          ),
        };
      }),
  });
  return null;
}

/** Brand-colored mark spans for matched substrings. */
function HighlightedText({
  text,
  ranges,
  className,
}: {
  text: string;
  ranges?: ReadonlyArray<MatchRange>;
  className?: string;
}): ReactNode {
  const segments = highlightSegments(text, ranges);
  return (
    <span className={className}>
      {segments.map((seg, i) =>
        seg.highlight ? (
          <mark
            key={i}
            className="rounded-sm bg-primary px-0.5 font-medium text-primary-foreground"
            data-testid="diff-search-match-mark"
          >
            {seg.text}
          </mark>
        ) : (
          <span key={i}>{seg.text}</span>
        ),
      )}
    </span>
  );
}

function rangesForField(
  result: DiffSearchResult,
  field: "path" | "content",
  displayText: string,
  query: string,
): MatchRange[] | undefined {
  // Prefer a contiguous substring of the typed query so the mark paints a full
  // token (Fuse fuzzy indices often highlight scattered characters).
  const contiguous = fallbackMatchRanges(displayText, query);
  if (contiguous.length > 0) return contiguous;

  const fromFuse = result.matches?.[field];
  // Path field on file docs may include previousPath; only trust Fuse ranges when
  // the searched string is what we display.
  if (fromFuse?.length && (field === "content" || result.path === displayText)) {
    return fromFuse;
  }
  return undefined;
}

function LineResultPreview({
  result,
  docs,
  query,
}: {
  result: Extract<DiffSearchResult, { kind: "line" }>;
  docs: ReturnType<typeof buildDiffSearchIndex>;
  query: string;
}) {
  const preview = useMemo(() => buildLinePreview(docs, result, 2), [docs, result]);
  const contentRanges = rangesForField(result, "content", result.content, query);

  return (
    <div
      className="mt-1.5 overflow-hidden rounded-md border border-border bg-surface font-mono text-sm leading-relaxed"
      data-testid="diff-search-line-preview"
    >
      {preview.map((line) => (
        <div
          key={line.lineIndex}
          className={cn(
            "flex min-w-0 gap-2 px-2.5 py-0.5 whitespace-pre-wrap break-all",
            line.isMatch && "bg-primary-muted/80",
            !line.isMatch && line.lineType === "add" && "bg-diff-add-bg/40",
            !line.isMatch && line.lineType === "del" && "bg-diff-del-bg/40",
          )}
          data-testid={line.isMatch ? "diff-search-preview-match-line" : "diff-search-preview-ctx"}
        >
          <span
            className={cn(
              "w-3 shrink-0 select-none opacity-70",
              line.lineType === "add" && "text-diff-add",
              line.lineType === "del" && "text-diff-del",
            )}
            aria-hidden="true"
          >
            {linePrefix(line.lineType)}
          </span>
          <span className="min-w-0 flex-1 text-muted">
            {line.isMatch ? (
              <HighlightedText
                text={line.content}
                ranges={contentRanges}
                className="text-foreground"
              />
            ) : (
              line.content
            )}
          </span>
        </div>
      ))}
    </div>
  );
}
