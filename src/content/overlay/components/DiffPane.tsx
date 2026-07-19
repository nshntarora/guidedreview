import { useEffect, useMemo } from "react";

import { highlightToLines, languageForPath } from "../../../lib/highlight";
import { cn } from "../../../lib/cn";
import type { DiffHunk } from "../../../lib/types";
import { buildSplitRows, type SplitCell } from "../buildSplitRows";
import type { DiffViewMode } from "../diffViewMode";
import { hydrateDiffViewMode, useReviewStore } from "../store";
import type { ResolvedUnitFile } from "../selectors";

interface DiffPaneProps {
  files: ResolvedUnitFile[];
  /** Title of the currently active review unit. */
  unitTitle: string;
}

/**
 * Highlight a hunk's lines against GitHub's syntax palette.
 *
 * We reconstruct the two file states the hunk straddles — the "old" text
 * (context + del lines) and the "new" text (context + add lines) — and
 * highlight each as a whole so multi-line constructs (block comments,
 * template strings) tokenize correctly, then walk the hunk lines back over
 * the resulting per-line HTML fragments.
 */
function highlightHunkLines(
  hunk: DiffHunk,
  language: string | undefined,
): (string | null)[] {
  if (!language) return hunk.lines.map(() => null);

  const oldText = hunk.lines
    .filter((l) => l.type !== "add")
    .map((l) => l.content)
    .join("\n");
  const newText = hunk.lines
    .filter((l) => l.type !== "del")
    .map((l) => l.content)
    .join("\n");

  const oldHighlighted = highlightToLines(oldText, language);
  const newHighlighted = highlightToLines(newText, language);

  let oldCursor = 0;
  let newCursor = 0;
  return hunk.lines.map((line) => {
    if (line.type === "del") return oldHighlighted[oldCursor++] ?? null;
    if (line.type === "add") return newHighlighted[newCursor++] ?? null;
    // context line — advance both cursors, prefer the "new" rendering
    const fragment =
      newHighlighted[newCursor] ?? oldHighlighted[oldCursor] ?? null;
    oldCursor++;
    newCursor++;
    return fragment;
  });
}

function CodeContent({
  content,
  highlighted,
}: {
  content: string;
  highlighted: string | null;
}) {
  if (highlighted != null) {
    return <span dangerouslySetInnerHTML={{ __html: highlighted }} />;
  }
  return <span>{content}</span>;
}

function UnifiedHunk({
  hunk,
  language,
}: {
  hunk: DiffHunk;
  language: string | undefined;
}) {
  const highlighted = useMemo(
    () => highlightHunkLines(hunk, language),
    [hunk, language],
  );

  return (
    <div
      className="overflow-x-auto font-mono text-[12px] leading-relaxed"
      data-testid="diff-view-unified"
    >
      {hunk.lines.map((line, i) => (
        <div
          key={i}
          className={cn(
            "flex whitespace-pre pr-3",
            line.type === "add" && "bg-gr-add-bg",
            line.type === "del" && "bg-gr-del-bg",
          )}
        >
          <span className="w-10 shrink-0 select-none pr-3 text-right text-gr-faint">
            {line.oldLine ?? ""}
          </span>
          <span className="w-10 shrink-0 select-none pr-3 text-right text-gr-faint">
            {line.newLine ?? ""}
          </span>
          <span
            className={cn(
              "w-4 shrink-0 opacity-70",
              line.type === "add" && "text-gr-add-text",
              line.type === "del" && "text-gr-del-text",
            )}
          >
            {line.type === "add" ? "+" : line.type === "del" ? "-" : ""}
          </span>
          <CodeContent content={line.content} highlighted={highlighted[i] ?? null} />
        </div>
      ))}
    </div>
  );
}

function SplitCellView({
  cell,
  highlighted,
  side,
}: {
  cell: SplitCell;
  highlighted: string | null;
  side: "left" | "right";
}) {
  if (cell.kind === "empty") {
    return (
      <div className="flex min-w-0 flex-1 whitespace-pre pr-3">
        <span className="w-10 shrink-0 select-none pr-3 text-right text-gr-faint" />
        <span className="min-w-0 flex-1" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 whitespace-pre pr-3",
        cell.type === "del" && "bg-gr-del-bg",
        cell.type === "add" && "bg-gr-add-bg",
      )}
      data-side={side}
    >
      <span className="w-10 shrink-0 select-none pr-3 text-right text-gr-faint">
        {cell.lineNumber ?? ""}
      </span>
      <span
        className={cn(
          "w-4 shrink-0 opacity-70",
          cell.type === "add" && "text-gr-add-text",
          cell.type === "del" && "text-gr-del-text",
        )}
      >
        {cell.type === "add" ? "+" : cell.type === "del" ? "-" : " "}
      </span>
      <CodeContent content={cell.content} highlighted={highlighted} />
    </div>
  );
}

function SplitHunk({
  hunk,
  language,
}: {
  hunk: DiffHunk;
  language: string | undefined;
}) {
  const highlighted = useMemo(
    () => highlightHunkLines(hunk, language),
    [hunk, language],
  );
  const rows = useMemo(() => buildSplitRows(hunk.lines), [hunk.lines]);

  return (
    <div
      className="overflow-x-auto font-mono text-[12px] leading-relaxed"
      data-testid="diff-view-split"
    >
      {rows.map((row, i) => (
        <div key={i} className="flex min-w-full border-b border-gr-border-muted last:border-b-0">
          <SplitCellView
            cell={row.left}
            highlighted={
              row.left.kind === "content"
                ? (highlighted[row.left.sourceIndex] ?? null)
                : null
            }
            side="left"
          />
          <div className="w-px shrink-0 bg-gr-border" aria-hidden="true" />
          <SplitCellView
            cell={row.right}
            highlighted={
              row.right.kind === "content"
                ? (highlighted[row.right.sourceIndex] ?? null)
                : null
            }
            side="right"
          />
        </div>
      ))}
    </div>
  );
}

function DiffViewToggle({
  mode,
  onChange,
}: {
  mode: DiffViewMode;
  onChange: (mode: DiffViewMode) => void;
}) {
  return (
    <div
      className="flex shrink-0 items-center"
      role="group"
      aria-label="Diff view"
      data-testid="diff-view-toggle"
    >
      <div className="inline-flex overflow-hidden rounded-md border border-gr-border">
        <button
          type="button"
          className={cn(
            "cursor-pointer px-3 py-1.5 text-[13px] transition-colors",
            mode === "unified"
              ? "bg-gr-subtle text-gr-text"
              : "bg-gr-bg text-gr-muted hover:bg-gr-subtle hover:text-gr-text",
          )}
          aria-pressed={mode === "unified"}
          onClick={() => onChange("unified")}
        >
          Unified
        </button>
        <button
          type="button"
          className={cn(
            "cursor-pointer border-l border-gr-border px-3 py-1.5 text-[13px] transition-colors",
            mode === "split"
              ? "bg-gr-subtle text-gr-text"
              : "bg-gr-bg text-gr-muted hover:bg-gr-subtle hover:text-gr-text",
          )}
          aria-pressed={mode === "split"}
          onClick={() => onChange("split")}
        >
          Split
        </button>
      </div>
    </div>
  );
}

export function DiffPane({ files, unitTitle }: DiffPaneProps) {
  const diffViewMode = useReviewStore((s) => s.diffViewMode);
  const setDiffViewMode = useReviewStore((s) => s.setDiffViewMode);

  useEffect(() => {
    void hydrateDiffViewMode();
  }, []);

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2
          className="min-w-0 truncate text-[15px] font-semibold text-gr-text"
          data-testid="diff-unit-title"
          title={unitTitle}
        >
          {unitTitle}
        </h2>
        <DiffViewToggle mode={diffViewMode} onChange={setDiffViewMode} />
      </div>
      {files.map(({ file, hunks }) => {
        const language = languageForPath(file.path);
        const extension = file.path.includes(".")
          ? file.path.split(".").pop()
          : undefined;
        return (
          <div
            className="mb-7 overflow-hidden rounded-lg border border-gr-border bg-gr-canvas"
            key={file.path}
          >
            <div className="flex items-baseline gap-2.5 border-b border-gr-border bg-gr-chrome px-3 py-2 font-mono text-[12.5px]">
              {file.previousPath
                ? `${file.previousPath} → ${file.path}`
                : file.path}
              {!language && !file.isBinaryOrElided && (
                <span className="font-normal text-gr-muted italic">
                  {extension
                    ? `no syntax highlighting for .${extension}`
                    : "no syntax highlighting"}
                </span>
              )}
            </div>
            {file.isBinaryOrElided ? (
              <div className="overflow-x-auto font-mono text-[13px] leading-relaxed">
                <div className="flex whitespace-pre pr-3">
                  <span>(binary or elided — no textual diff available)</span>
                </div>
              </div>
            ) : (
              hunks.map((hunk) =>
                diffViewMode === "split" ? (
                  <SplitHunk hunk={hunk} language={language} key={hunk.id} />
                ) : (
                  <UnifiedHunk hunk={hunk} language={language} key={hunk.id} />
                ),
              )
            )}
          </div>
        );
      })}
    </>
  );
}
