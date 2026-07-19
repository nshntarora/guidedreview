import { useMemo } from "react";

import { highlightToLines, languageForPath } from "../../../lib/highlight";
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
    <div className="gr-diff-hunk">
      {hunk.lines.map((line, i) => (
        <div
          key={i}
          className={`gr-diff-line${line.type === "add" ? " gr-add" : line.type === "del" ? " gr-del" : ""}`}
        >
          <span className="gr-diff-gutter">{line.oldLine ?? ""}</span>
          <span className="gr-diff-gutter">{line.newLine ?? ""}</span>
          <span className="gr-diff-marker">
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
          <div className="gr-file-block" key={file.path}>
            <div className="gr-file-block-header">
              {file.previousPath ? `${file.previousPath} → ${file.path}` : file.path}
              {!language && !file.isBinaryOrElided && (
                <span className="gr-file-block-header-note">
                  {extension ? `no syntax highlighting for .${extension}` : "no syntax highlighting"}
                </span>
              )}
            </div>
            {file.isBinaryOrElided ? (
              <div className="gr-diff-hunk">
                <div className="gr-diff-line gr-context">
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
