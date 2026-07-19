import { useMemo } from "react";

import { highlightToLines, languageForPath } from "../../../lib/highlight";
import { cn } from "../../../lib/cn";
import type { DiffHunk } from "../../../lib/types";
import type { ResolvedUnitFile } from "../selectors";

interface DiffPaneProps {
  files: ResolvedUnitFile[];
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
function highlightHunkLines(hunk: DiffHunk, language: string | undefined): (string | null)[] {
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
    const fragment = newHighlighted[newCursor] ?? oldHighlighted[oldCursor] ?? null;
    oldCursor++;
    newCursor++;
    return fragment;
  });
}

function HunkBlock({ hunk, language }: { hunk: DiffHunk; language: string | undefined }) {
  const highlighted = useMemo(() => highlightHunkLines(hunk, language), [hunk, language]);

  return (
    <div className="overflow-x-auto font-mono text-[13px] leading-relaxed">
      {hunk.lines.map((line, i) => (
        <div
          key={i}
          className={cn(
            "flex whitespace-pre pr-3",
            line.type === "add" && "bg-gr-add-bg",
            line.type === "del" && "bg-gr-del-bg"
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
              line.type === "del" && "text-gr-del-text"
            )}
          >
            {line.type === "add" ? "+" : line.type === "del" ? "-" : ""}
          </span>
          {highlighted[i] != null ? (
            <span dangerouslySetInnerHTML={{ __html: highlighted[i] as string }} />
          ) : (
            <span>{line.content}</span>
          )}
        </div>
      ))}
    </div>
  );
}

export function DiffPane({ files }: DiffPaneProps) {
  return (
    <>
      {files.map(({ file, hunks }) => {
        const language = languageForPath(file.path);
        const extension = file.path.includes(".") ? file.path.split(".").pop() : undefined;
        return (
          <div
            className="mb-7 overflow-hidden rounded-lg border border-gr-border bg-gr-canvas"
            key={file.path}
          >
            <div className="flex items-baseline gap-2.5 border-b border-gr-border bg-gr-chrome px-3 py-2 font-mono text-[12.5px]">
              {file.previousPath ? `${file.previousPath} → ${file.path}` : file.path}
              {!language && !file.isBinaryOrElided && (
                <span className="font-normal text-gr-muted italic">
                  {extension ? `no syntax highlighting for .${extension}` : "no syntax highlighting"}
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
              hunks.map((hunk) => <HunkBlock hunk={hunk} language={language} key={hunk.id} />)
            )}
          </div>
        );
      })}
    </>
  );
}
