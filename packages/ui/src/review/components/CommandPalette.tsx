import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type RefObject,
} from "react";
import Fuse from "fuse.js";
import { Button, cn, Input, Kbd } from "@guided-review/ui";
import { useCommandPalette, type CommandResult } from "@guided-review/ui/review/commandPalette";
import { ShortcutKeys } from "./ShortcutKeys";

interface CommandPaletteProps {
  dialogRef: RefObject<HTMLDivElement | null>;
  keyActionRef: MutableRefObject<((event: globalThis.KeyboardEvent) => boolean) | null>;
}

/** Palette-specific glyphs; unknown host actions use the command symbol. */
function CommandIcon({ id, className }: { id: string; className?: string }) {
  const paths: Record<string, string> = {
    search: "m21 21-4.4-4.4 M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
    settings:
      "M4 7h9m4 0h3M4 17h3m4 0h9 M17 7a2 2 0 1 1-4 0 2 2 0 0 1 4 0 M11 17a2 2 0 1 1-4 0 2 2 0 0 1 4 0",
    "keyboard-shortcuts":
      "M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1 M7 9h.01M12 9h.01M17 9h.01M7 12h.01M12 12h.01M17 12h.01M8 16h8",
    "view-mode": "M4 4h16v16H4zM12 4v16",
    "generate-prompt": "M14 3H5v18h14V8zM14 3v5h5M8 12h8M8 16h5",
    "submit-review": "m21 3-7 18-4-7-7-4 18-7ZM10 14 21 3",
    unified: "M4 4h16v16H4zM8 9h8M8 13h8M8 17h5",
    split: "M4 4h16v16H4zM12 4v16M7 9h2M15 9h2M7 13h2M15 13h2",
    back: "m12 5-7 7 7 7M5 12h14",
    chevron: "m9 5 7 7-7 7",
  };
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("shrink-0", className ?? "size-4")}
      aria-hidden="true"
    >
      <path
        d={
          paths[id] ??
          "M9 9V5.5A2.5 2.5 0 1 0 6.5 8H17.5A2.5 2.5 0 1 0 15 5.5V18.5A2.5 2.5 0 1 0 17.5 16H6.5A2.5 2.5 0 1 0 9 18.5V9Z"
        }
      />
    </svg>
  );
}

export function CommandPalette(props: CommandPaletteProps) {
  const isOpen = useCommandPalette((state) => state.isOpen);
  const actionId = useCommandPalette((state) => state.actionId);
  if (!isOpen) return null;
  return <CommandPaletteDialog key={actionId ?? "actions"} {...props} />;
}

function CommandPaletteDialog({ dialogRef, keyActionRef }: CommandPaletteProps) {
  const actions = useCommandPalette((state) => state.actions);
  const actionId = useCommandPalette((state) => state.actionId);
  const focusRequestId = useCommandPalette((state) => state.focusRequestId);
  const open = useCommandPalette((state) => state.open);
  const close = useCommandPalette((state) => state.close);
  const action = actionId ? actions.get(actionId) : undefined;
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listboxId = useId();
  const titleId = useId();
  const isSearch = action?.id === "search";
  const results: CommandResult[] = useMemo(() => {
    if (action?.results) return action.results(query);
    if (action?.content) return [];
    const list = [...actions.values()];
    const filtered = query.trim()
      ? new Fuse(list, {
          keys: ["label", "keywords", "description"],
          threshold: 0.35,
          ignoreLocation: true,
        })
          .search(query.trim())
          .map((hit) => hit.item)
      : list;
    return filtered.map((item) => ({
      ...item,
      testId: `command-action-${item.id}`,
      content: undefined,
      onSelect: () => {
        if (item.results || item.content) open(item.id);
        else {
          close();
          item.onSelect?.();
        }
      },
    }));
  }, [action, actions, query, open, close]);
  const index = Math.min(activeIndex, Math.max(0, results.length - 1));

  function select(result: CommandResult | undefined) {
    if (!result || result.disabled) return;
    // Nested results are terminal; root actions can open another palette step.
    if (action) close();
    result.onSelect();
  }

  function handleKey(event: globalThis.KeyboardEvent): boolean {
    if (event.isComposing) return false;
    if (
      event.key === "Enter" &&
      event.composedPath().some((node) => node instanceof HTMLButtonElement)
    )
      return false;
    if (event.key === "Escape") {
      close();
      return true;
    }
    if (event.key === "Backspace" && !query && action) {
      open();
      return true;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      const delta = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex(results.length ? (index + delta + results.length) % results.length : 0);
      return true;
    }
    if (event.key === "Enter" && !event.metaKey && !event.ctrlKey && !event.altKey) {
      select(results[index]);
      return true;
    }
    return false;
  }

  useEffect(() => {
    keyActionRef.current = handleKey;
    return () => {
      keyActionRef.current = null;
    };
  });

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      (inputRef.current ?? dialogRef.current)?.focus();
      inputRef.current?.select();
    });
    return () => cancelAnimationFrame(frame);
  }, [focusRequestId, dialogRef]);

  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-search-index="${index}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [index, results]);

  const closeButton = (
    <Button
      variant="ghost"
      size="sm"
      className="shrink-0 [&]:rounded-md [&]:border-border [&]:px-1.5 [&]:py-0.5 [&]:text-sm"
      data-testid="command-palette-close"
      aria-label="Close command menu"
      onClick={close}
    >
      Esc
    </Button>
  );

  return (
    <div
      className="motion-safe:animate-gr-fade absolute inset-0 z-[60]"
      data-testid="command-palette-root"
    >
      <div
        className="absolute inset-0 bg-background/70 backdrop-blur-sm"
        aria-hidden="true"
        data-testid="command-palette-backdrop"
        onMouseDown={(event) => {
          if (event.button === 0) close();
        }}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center px-3 pt-[min(16vh,8rem)] sm:px-6">
        <div
          ref={dialogRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          data-testid="command-palette"
          className={cn(
            "motion-safe:animate-gr-enter pointer-events-auto relative flex max-h-[76dvh] w-full flex-col overflow-hidden rounded-xl border border-border-strong/80 bg-surface-raised shadow-2xl ring-1 ring-foreground/5",
            isSearch ? "max-w-2xl" : "max-w-xl",
          )}
        >
          <div className="shrink-0 border-b border-border/80">
            {action ? (
              <div className="flex min-h-12 items-center justify-between gap-3 px-4">
                <div className="flex min-w-0 items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="[&]:gap-1.5 [&]:px-1.5 [&]:py-1 [&]:text-sm"
                    data-testid="command-palette-back"
                    aria-label="Back to actions"
                    onClick={() => open()}
                  >
                    <CommandIcon id="back" className="size-3.5" />
                    Actions
                  </Button>
                  <CommandIcon id="chevron" className="size-3 text-faint" />
                  <h2 id={titleId} className="m-0 truncate text-sm font-medium text-foreground">
                    {action.label}
                  </h2>
                </div>
                {closeButton}
              </div>
            ) : (
              <h2 id={titleId} className="gr-sr-only">
                Actions
              </h2>
            )}
            {!action?.content && (
              <div className="flex min-h-16 items-center gap-3 px-5">
                <CommandIcon id="search" className="size-5 text-muted" />
                <Input
                  ref={inputRef}
                  type="search"
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setActiveIndex(0);
                  }}
                  onKeyDown={(event) => {
                    if (handleKey(event.nativeEvent)) event.preventDefault();
                  }}
                  placeholder={action?.placeholder ?? "Find an action…"}
                  aria-label={action?.placeholder ?? "Find an action"}
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  role="combobox"
                  aria-autocomplete="list"
                  aria-expanded={true}
                  aria-controls={listboxId}
                  aria-activedescendant={
                    results.length ? `${listboxId}-option-${index}` : undefined
                  }
                  data-testid={isSearch ? "diff-search-input" : "command-palette-input"}
                  className="min-w-0 flex-1 [&]:rounded-none [&]:border-0 [&]:bg-transparent [&]:px-0 [&]:py-3 [&]:text-lg [&]:placeholder:text-muted [&]:focus-visible:outline-none"
                />
                {!action && closeButton}
              </div>
            )}
          </div>
          <div className="gr-sr-only" role="status" aria-live="polite">
            {!action?.content && `${results.length} results`}
          </div>
          {action?.content ? (
            <div className="min-h-0 overflow-y-auto px-5 pb-5">{action.content}</div>
          ) : (
            <>
              {results.length > 0 && (
                <div
                  className="flex shrink-0 items-center justify-between px-5 pt-3 pb-1.5 text-sm text-muted"
                  aria-hidden="true"
                >
                  <span>
                    {query.trim() || isSearch ? "Results" : action ? "Options" : "Commands"}
                  </span>
                  <span className="text-faint tabular-nums">{results.length}</span>
                </div>
              )}
              <ul
                ref={listRef}
                id={listboxId}
                role="listbox"
                aria-label={action ? action.label : "Actions"}
                data-testid={isSearch ? "diff-search-results" : "command-palette-results"}
                className="m-0 min-h-0 max-h-[min(28rem,52dvh)] list-none overflow-y-auto px-2 pb-2"
              >
                {results.map((result, resultIndex) => (
                  <li
                    key={result.id}
                    id={`${listboxId}-option-${resultIndex}`}
                    role="option"
                    aria-selected={resultIndex === index}
                    aria-disabled={result.disabled || undefined}
                    data-search-index={resultIndex}
                    data-testid={result.testId ?? `command-result-${result.id}`}
                    className={cn(
                      "cursor-pointer rounded-md border px-3 py-2.5 transition-colors duration-100",
                      resultIndex === index
                        ? "border-border-strong/70 bg-surface-muted"
                        : "border-transparent hover:bg-surface-muted/60",
                      result.disabled && "cursor-not-allowed opacity-60",
                    )}
                    onMouseEnter={() => setActiveIndex(resultIndex)}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => select(result)}
                  >
                    {result.content ?? (
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            "flex size-7 shrink-0 items-center justify-center rounded-md",
                            resultIndex === index
                              ? "bg-background/40 text-foreground"
                              : "bg-surface text-muted",
                          )}
                        >
                          <CommandIcon id={result.id} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-base font-medium text-foreground">
                            {result.label}
                          </div>
                          {result.description && (
                            <div className="mt-0.5 text-sm leading-relaxed text-muted">
                              {result.description}
                            </div>
                          )}
                        </div>
                        {!action && actions.get(result.id)?.shortcut && (
                          <ShortcutKeys
                            keys={actions.get(result.id)!.shortcut!}
                            className="shrink-0 [&_[data-slot=kbd]]:border-border-strong/60 [&_[data-slot=kbd]]:bg-background/30 [&_[data-slot=kbd]]:opacity-100"
                          />
                        )}
                        {!action && (
                          <span className="flex w-3.5 shrink-0 justify-center" aria-hidden="true">
                            {(actions.get(result.id)?.results ||
                              actions.get(result.id)?.content) && (
                              <CommandIcon id="chevron" className="size-3.5 text-faint" />
                            )}
                          </span>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
              {results.length === 0 && (
                <div
                  role="status"
                  className="flex flex-col items-center gap-3 px-6 py-10 text-center"
                  data-testid="command-palette-empty"
                >
                  <span
                    className="flex size-10 items-center justify-center rounded-xl border border-border bg-surface text-muted"
                    aria-hidden="true"
                  >
                    <CommandIcon id="search" className="size-5" />
                  </span>
                  <p className="m-0 max-w-xs text-base leading-relaxed text-muted">
                    {query.trim()
                      ? "No matches. Try another search."
                      : (action?.emptyMessage ?? "No actions available.")}
                  </p>
                </div>
              )}
            </>
          )}
          <div
            className="flex min-h-11 shrink-0 items-center justify-between gap-3 border-t border-border/80 bg-surface/60 px-4 py-2 text-sm text-muted"
            aria-hidden="true"
          >
            <span className="flex items-center gap-1.5">
              {action && !query ? (
                <>
                  <Kbd className="border-border-strong/60 bg-transparent opacity-100">⌫</Kbd> Back
                </>
              ) : (
                <>
                  <CommandIcon id="command" className="size-3.5" />
                  <span className="hidden sm:inline">Guided Review</span>
                </>
              )}
            </span>
            {!action?.content && (
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="inline-flex gap-0.5">
                    <Kbd className="border-border-strong/60 bg-transparent opacity-100">↑</Kbd>
                    <Kbd className="border-border-strong/60 bg-transparent opacity-100">↓</Kbd>
                  </span>
                  Navigate
                </span>
                <span className="flex items-center gap-1.5">
                  <Kbd className="border-border-strong/60 bg-transparent opacity-100">↵</Kbd>
                  {isSearch ? "Open" : "Select"}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
