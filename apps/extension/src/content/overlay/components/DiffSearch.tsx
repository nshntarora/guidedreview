import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MutableRefObject,
  type ReactNode,
} from "react";
import { cn, Input } from "@guided-review/ui";
import {
  buildDiffSearchIndex,
  buildLinePreview,
  fallbackMatchRanges,
  highlightSegments,
  searchDiff,
  type DiffSearchResult,
  type MatchRange,
} from "../diffSearch";
import type { ParsedDiff } from "../../../lib/types";

export interface DiffSearchProps {
  open: boolean;
  diff: ParsedDiff | null;
  onClose: () => void;
  onSelect: (result: DiffSearchResult) => void;
  /**
   * Re-focus + select-all when the parent re-requests (⌘F while already open).
   */
  focusRequestId?: number;
  /**
   * Overlay capture-phase keyboard routes Arrow/Enter here (React handlers on
   * the input never see keydown because the overlay stops propagation).
   * Return true when the key was handled.
   */
  keyActionRef?: MutableRefObject<((e: globalThis.KeyboardEvent) => boolean) | null>;
}

function linePrefix(type: "add" | "del" | "context"): string {
  if (type === "add") return "+";
  if (type === "del") return "−";
  return " ";
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

/**
 * Floating search palette for the whole PR diff. Opened via ⌘/Ctrl+F while the
 * overlay is open; results cover every file and line, not only the active unit.
 */
export function DiffSearch({
  open,
  diff,
  onClose,
  onSelect,
  focusRequestId = 0,
  keyActionRef,
}: DiffSearchProps) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const labelId = useId();

  const docs = useMemo(() => (diff ? buildDiffSearchIndex(diff) : []), [diff]);
  const results = useMemo(() => searchDiff(docs, query), [docs, query]);

  // Latest values for the capture-phase key handler without re-binding every stroke.
  const resultsRef = useRef(results);
  resultsRef.current = results;
  const activeIndexRef = useRef(activeIndex);
  activeIndexRef.current = activeIndex;
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Reset query when reopened fresh; keep query if only re-focusing.
  useEffect(() => {
    if (!open) {
      setQuery("");
      setActiveIndex(0);
    }
  }, [open]);

  // Autofocus when opened or when parent re-requests focus (⌘F while open).
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      const el = inputRef.current;
      if (!el) return;
      el.focus();
      el.select();
    });
    return () => cancelAnimationFrame(frame);
  }, [open, focusRequestId]);

  // Clamp active index when results shrink.
  useEffect(() => {
    setActiveIndex((i) => (results.length === 0 ? 0 : Math.min(i, results.length - 1)));
  }, [results.length]);

  // Scroll the active option into view inside the list.
  useEffect(() => {
    if (!open || results.length === 0) return;
    const list = listRef.current;
    if (!list) return;
    const option = list.querySelector<HTMLElement>(`[data-search-index="${activeIndex}"]`);
    option?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex, results.length]);

  // Click outside the panel closes search.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      const panel = panelRef.current;
      if (!panel) return;
      const path = event.composedPath();
      if (!path.includes(panel)) onClose();
    }
    // Bubble phase so the search option's own click runs first.
    window.addEventListener("mousedown", onPointerDown);
    return () => window.removeEventListener("mousedown", onPointerDown);
  }, [open, onClose]);

  // Register capture-phase actions for the overlay keyboard hook.
  useEffect(() => {
    if (!keyActionRef || !open) return;

    function moveActive(delta: number) {
      const list = resultsRef.current;
      if (list.length === 0) return;
      setActiveIndex((i) => {
        const next = i + delta;
        if (next < 0) return list.length - 1;
        if (next >= list.length) return 0;
        return next;
      });
    }

    function selectActive() {
      const result = resultsRef.current[activeIndexRef.current];
      if (!result) return;
      onSelectRef.current(result);
    }

    keyActionRef.current = (event: globalThis.KeyboardEvent) => {
      switch (event.key) {
        case "ArrowDown":
          moveActive(1);
          return true;
        case "ArrowUp":
          moveActive(-1);
          return true;
        case "Enter":
          if (event.metaKey || event.ctrlKey || event.altKey) return false;
          selectActive();
          return true;
        case "Escape":
          onCloseRef.current();
          return true;
        default:
          return false;
      }
    };

    return () => {
      keyActionRef.current = null;
    };
  }, [keyActionRef, open]);

  if (!open) return null;

  function selectIndex(index: number) {
    const result = results[index];
    if (!result) return;
    onSelect(result);
  }

  /** Fallback when the input still receives keydown (e.g. unit tests). */
  function onInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActiveIndex((i) => {
          if (results.length === 0) return 0;
          return i + 1 >= results.length ? 0 : i + 1;
        });
        return;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex((i) => {
          if (results.length === 0) return 0;
          return i - 1 < 0 ? results.length - 1 : i - 1;
        });
        return;
      case "Enter":
        event.preventDefault();
        selectIndex(activeIndex);
        return;
      case "Escape":
        event.preventDefault();
        onClose();
        return;
      default:
        return;
    }
  }

  const activeOptionId = results.length > 0 ? `${listboxId}-option-${activeIndex}` : undefined;

  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-0 z-[60] flex justify-center px-6 pt-12"
      data-testid="diff-search-root"
    >
      <div
        ref={panelRef}
        className="pointer-events-auto w-full max-w-3xl overflow-hidden rounded-xl border border-border-strong bg-background shadow-2xl"
        data-testid="diff-search"
        role="presentation"
      >
        <div className="border-b border-border px-4 py-3.5">
          <label id={labelId} className="gr-sr-only" htmlFor={`${listboxId}-input`}>
            Search files and code in this pull request
          </label>
          <Input
            ref={inputRef}
            id={`${listboxId}-input`}
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={onInputKeyDown}
            placeholder="Search files and code…"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={true}
            aria-controls={listboxId}
            aria-activedescendant={activeOptionId}
            aria-labelledby={labelId}
            data-testid="diff-search-input"
            className="border-border-strong bg-surface-raised px-3.5 py-2.5 font-mono text-base"
          />
          <div
            className="mt-2 flex items-center justify-between text-sm text-muted"
            data-testid="diff-search-meta"
            aria-live="polite"
          >
            <span>
              {query.trim()
                ? results.length === 0
                  ? "No matches"
                  : `${results.length} match${results.length === 1 ? "" : "es"}`
                : "Search files and code in this PR"}
            </span>
            <span className="text-faint" aria-hidden="true">
              ↑↓ navigate · Enter open · Esc close
            </span>
          </div>
        </div>

        {query.trim() && results.length > 0 ? (
          <ul
            ref={listRef}
            id={listboxId}
            role="listbox"
            aria-label="Search results"
            className="m-0 max-h-[min(28rem,55vh)] list-none overflow-y-auto p-2"
            data-testid="diff-search-results"
          >
            {results.map((result, index) => {
              const isActive = index === activeIndex;
              const pathRanges = rangesForField(result, "path", result.filePath, query);

              return (
                <li
                  key={result.id}
                  id={`${listboxId}-option-${index}`}
                  role="option"
                  aria-selected={isActive}
                  data-search-index={index}
                  data-testid={
                    result.kind === "file" ? "diff-search-result-file" : "diff-search-result-line"
                  }
                  className={cn(
                    "cursor-pointer rounded-lg px-3 py-2.5",
                    isActive ? "bg-primary-muted" : "hover:bg-surface-raised",
                  )}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseDown={(e) => {
                    // Prevent input blur before click registers.
                    e.preventDefault();
                  }}
                  onClick={() => selectIndex(index)}
                >
                  <div
                    className="truncate font-mono text-base text-foreground"
                    title={result.filePath}
                  >
                    <HighlightedText text={result.filePath} ranges={pathRanges} />
                  </div>

                  {result.kind === "file" ? (
                    <div className="mt-1 text-sm text-muted">File name match</div>
                  ) : (
                    <LineResultPreview result={result} docs={docs} query={query} />
                  )}
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </div>
  );
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
