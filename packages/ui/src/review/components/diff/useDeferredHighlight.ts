import { useEffect, useState } from "react";
import type { DiffHunk } from "@guided-review/ui/review/types";
import { afterPaint } from "@guided-review/ui/review/afterPaint";
import { highlightHunkLines } from "./hunkShared";

/** Code is readable on the first paint; tokenization starts afterwards. */
export function useDeferredHighlight(hunk: DiffHunk, language: string | undefined) {
  const [result, setResult] = useState<{
    hunk: DiffHunk;
    language: string;
    lines: (string | null)[];
  } | null>(null);

  useEffect(() => {
    if (!language) return;
    return afterPaint(() => {
      setResult({ hunk, language, lines: highlightHunkLines(hunk, language) });
    });
  }, [hunk, language]);

  // Never show a previous hunk's markup while its replacement is pending.
  return result?.hunk === hunk && result.language === language ? result.lines : null;
}
