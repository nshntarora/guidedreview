import { useEffect, useState } from "react";
import { cn } from "@guided-review/ui";
import { buildFileLineUrl } from "@extension/lib/github/prUrls";
import { useReviewStore } from "@extension/content/overlay/store";

interface HunkGapPlaceholderProps {
  filePath: string;
  /** Line number immediately above the omitted range. */
  afterLine: number;
}

/**
 * Clickable ellipsis between hunks when the patch omits lines.
 * Opens the file on GitHub at `afterLine` (new tab).
 */
export function HunkGapPlaceholder({ filePath, afterLine }: HunkGapPlaceholderProps) {
  const prContext = useReviewStore((s) => s.prContext);
  const [href, setHref] = useState<string | null>(null);

  useEffect(() => {
    if (!prContext) {
      setHref(null);
      return;
    }
    let cancelled = false;
    void buildFileLineUrl(
      { owner: prContext.owner, repo: prContext.repo, number: prContext.number },
      { filePath, line: afterLine, headRef: prContext.headRef },
    ).then((url) => {
      if (!cancelled) setHref(url);
    });
    return () => {
      cancelled = true;
    };
  }, [prContext, filePath, afterLine]);

  const label = `View Collapsed Lines (line ${afterLine})`;
  const className = cn(
    // Match the surrounding hunk surface (parent is bg-surface-raised); no
    // separate wash so it reads as part of the diff, not a chrome bar.
    "flex w-full items-center justify-center gap-2 border-y border-border",
    "py-1.5 font-mono text-sm text-faint",
    href && "cursor-pointer hover:bg-surface-muted hover:text-muted",
  );

  const content = (
    <>
      <span aria-hidden="true">⋯</span>
      <span>View Collapsed Lines</span>
      <span aria-hidden="true">⋯</span>
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        aria-label={label}
        title={label}
        data-testid="hunk-gap-placeholder"
      >
        {content}
      </a>
    );
  }

  return (
    <div className={className} role="presentation" title={label} data-testid="hunk-gap-placeholder">
      {content}
    </div>
  );
}
