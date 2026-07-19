import type { ParsedDiff, PRContext } from "../../../lib/types";
import { Kbd } from "./Kbd";

interface ProgressHeaderProps {
  currentIndex: number;
  total: number;
  prContext: PRContext | null;
  diff: ParsedDiff | null;
  onExit: () => void;
}

export function ProgressHeader({ currentIndex, total, prContext, diff, onExit }: ProgressHeaderProps) {
  const stats = diff && diffStats(diff);
  const logomarkUrl = chrome.runtime.getURL("logomark.svg");

  return (
    <header className="gr-header">
      <div className="gr-header-row">
        <div className="gr-header-brand">
          <img
            className="gr-header-logomark"
            src={logomarkUrl}
            alt=""
            width={32}
            height={16}
            aria-hidden="true"
          />
          <div className="gr-header-titles">
            <div className="gr-header-identity">
              <span className="gr-header-pr-title">{prContext?.title || "Guided Review"}</span>
              {prContext && <span className="gr-header-pr-number">#{prContext.number}</span>}
            </div>
            {prContext && (prContext.author || prContext.baseRef || prContext.headRef || stats) && (
              <div className="gr-header-meta">
                {prContext.author && <span className="gr-author">@{prContext.author}</span>}
                {(prContext.baseRef || prContext.headRef) && (
                  <span className="gr-branch-chip">
                    {prContext.baseRef || "?"} ← {prContext.headRef || "?"}
                  </span>
                )}
                {stats && (
                  <span className="gr-pr-stats">
                    {stats.files} file{stats.files === 1 ? "" : "s"} changed
                    <span className="gr-stat-add"> +{stats.additions}</span>
                    <span className="gr-stat-del"> −{stats.deletions}</span>
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="gr-header-actions">
          {total > 0 && (
            <span className="gr-header-progress">
              Step {currentIndex + 1} of {total}
            </span>
          )}
          <button className="gr-exit-btn" onClick={onExit}>
            Exit
            <Kbd>Esc</Kbd>
          </button>
        </div>
      </div>

      {prContext?.description && (
        <details className="gr-pr-description">
          <summary>Description</summary>
          {prContext.descriptionHtml ? (
            <div
              className="gr-pr-description-body markdown-body"
              dangerouslySetInnerHTML={{ __html: prContext.descriptionHtml }}
            />
          ) : (
            <div className="gr-pr-description-body">{prContext.description}</div>
          )}
        </details>
      )}
    </header>
  );
}

function diffStats(diff: ParsedDiff): { files: number; additions: number; deletions: number } {
  let additions = 0;
  let deletions = 0;
  for (const file of diff.files) {
    for (const hunk of file.hunks) {
      for (const line of hunk.lines) {
        if (line.type === "add") additions += 1;
        else if (line.type === "del") deletions += 1;
      }
    }
  }
  return { files: diff.files.length, additions, deletions };
}
