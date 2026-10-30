import { useEffect, useRef, useState } from "react";
import type { DiffHunk } from "@guided-review/ui/review/types";
import { afterPaint } from "@guided-review/ui/review/afterPaint";
import { highlightHunkLines } from "./hunkShared";

type Highlight = (string | null)[];
// Weak keys release results with their diff. The byte budget also bounds reuse
// while a very large session is still alive (UTF-16 strings use two bytes/char).
let cache = new WeakMap<DiffHunk, Map<string, Highlight>>();
let cachedBytes = 0;
const MAX_CACHE_BYTES = 2 * 1024 * 1024;
const jobs: (() => void)[] = [];
let scheduled = false;
function enqueue(work: () => void) {
  jobs.push(work);
  const cancel = () => {
    const index = jobs.indexOf(work);
    if (index !== -1) jobs.splice(index, 1);
  };
  if (scheduled) return cancel;
  scheduled = true;
  const next = () => {
    jobs.shift()?.();
    if (jobs.length) afterPaint(next);
    else scheduled = false;
  };
  afterPaint(next);
  return cancel;
}

/** Highlight visible hunks one at a time, keeping plain code readable first. */
export function useDeferredHighlight(hunk: DiffHunk, language: string | undefined) {
  const ref = useRef<HTMLDivElement>(null);
  const [result, setResult] = useState<{
    hunk: DiffHunk;
    language: string;
    lines: Highlight;
  } | null>(null);

  useEffect(() => {
    if (!language) return;
    let active = true;
    let cancelWork: (() => void) | undefined;
    const schedule = () => {
      cancelWork = enqueue(() => {
        if (!active) return;
        let lines = cache.get(hunk)?.get(language);
        if (!lines) {
          lines = highlightHunkLines(hunk, language);
          const bytes = lines.reduce((sum, line) => sum + (line?.length ?? 0) * 2, 0);
          if (cachedBytes + bytes > MAX_CACHE_BYTES) {
            cache = new WeakMap();
            cachedBytes = 0;
          }
          if (bytes <= MAX_CACHE_BYTES) {
            const languages = cache.get(hunk) ?? new Map<string, Highlight>();
            languages.set(language, lines);
            cache.set(hunk, languages);
            cachedBytes += bytes;
          }
        }
        setResult({ hunk, language, lines });
      });
    };
    let observer: IntersectionObserver | undefined;
    if (typeof IntersectionObserver === "undefined" || !ref.current) schedule();
    else {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            observer?.disconnect();
            schedule();
          }
        },
        { rootMargin: "800px" },
      );
      observer.observe(ref.current);
    }
    return () => {
      active = false;
      cancelWork?.();
      observer?.disconnect();
    };
  }, [hunk, language]);

  return {
    ref,
    lines: result?.hunk === hunk && result.language === language ? result.lines : null,
  };
}
