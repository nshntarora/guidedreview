import { useEffect, useState } from "react";
import { cn } from "@guided-review/ui";
import { useReviewHost } from "@guided-review/ui/review/host";
import { useReviewStore } from "@guided-review/ui/review/store";

interface HunkGapPlaceholderProps {
  filePath: string;
  /** Line number immediately above the omitted range. */
  afterLine: number;
  lineCount: number;
}

/**
 * Shows omitted lines between hunks. GitHub links to the file in a new tab.
 */
export function HunkGapPlaceholder({ filePath, afterLine, lineCount }: HunkGapPlaceholderProps) {
  const host = useReviewHost();
  const isLocal = host.kind === "local";
  const prContext = useReviewStore((s) => s.prContext);
  const [href, setHref] = useState<string | null>(null);

  useEffect(() => {
    if (isLocal || !prContext || !host.fileLineUrl) {
      setHref(null);
      return;
    }
    let cancelled = false;
    void host.fileLineUrl(filePath, afterLine, prContext).then((url) => {
      if (!cancelled) setHref(url);
    });
    return () => {
      cancelled = true;
    };
  }, [host, isLocal, prContext, filePath, afterLine]);

  // TODO: This count-only local placeholder is temporary; support expanding local context lines.
  const text = isLocal
    ? `${lineCount} collapsed ${lineCount === 1 ? "line" : "lines"}`
    : "View Collapsed Lines";
  const label = isLocal ? text : `View Collapsed Lines (line ${afterLine})`;
  const linkHref = isLocal ? null : href;
  const className = cn(
    // Match the surrounding hunk surface (parent is bg-surface-raised); no
    // separate wash so it reads as part of the diff, not a chrome bar.
    "flex w-full items-center justify-center gap-2 border-y border-border",
    "py-1.5 font-mono text-sm text-faint",
    linkHref && "cursor-pointer hover:bg-surface-muted hover:text-muted",
  );

  const content = (
    <>
      <span aria-hidden="true">⋯</span>
      <span>{text}</span>
      <span aria-hidden="true">⋯</span>
    </>
  );

  if (linkHref) {
    return (
      <a
        href={linkHref}
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
