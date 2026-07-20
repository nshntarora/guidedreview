import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { cn } from "../../lib/cn";

export interface SelectOption<T extends string = string> {
  value: T;
  /** Plain-text label used for a11y names and typeahead matching. */
  label: string;
  /**
   * Optional rich content for the option row and selected trigger.
   * Use a function so the trigger and list each get a fresh element tree
   * (a single React element cannot be mounted in two places).
   */
  content?: () => ReactNode;
  disabled?: boolean;
}

export interface SelectProps<T extends string = string> {
  id?: string;
  /** Accessible name when no visible label is associated via htmlFor. */
  "aria-labelledby"?: string;
  "aria-label"?: string;
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
  className?: string;
  /** Placeholder when value is not in options (should be rare after normalize). */
  placeholder?: string;
}

function findNextEnabled(
  options: SelectOption[],
  from: number,
  direction: 1 | -1,
): number {
  if (options.length === 0) return -1;
  let i = from;
  for (let n = 0; n < options.length; n++) {
    i = (i + direction + options.length) % options.length;
    if (!options[i].disabled) return i;
  }
  return from >= 0 && from < options.length && !options[from].disabled ? from : -1;
}

/**
 * Accessible custom select (WAI-ARIA listbox pattern) that supports icons and
 * other rich option content. Keyboard: ArrowUp/Down, Home/End, Enter/Space,
 * Escape, and single-character typeahead.
 */
export function Select<T extends string = string>({
  id,
  "aria-labelledby": ariaLabelledBy,
  "aria-label": ariaLabel,
  value,
  options,
  onChange,
  disabled = false,
  className,
  placeholder = "Select…",
}: SelectProps<T>) {
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const typeaheadRef = useRef({ query: "", timeout: 0 as ReturnType<typeof setTimeout> | 0 });

  const [open, setOpen] = useState(false);
  const selectedIndex = useMemo(
    () => options.findIndex((o) => o.value === value),
    [options, value],
  );
  const [highlightIndex, setHighlightIndex] = useState(
    selectedIndex >= 0 ? selectedIndex : 0,
  );

  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined;

  const close = useCallback((focusTrigger = true) => {
    setOpen(false);
    if (focusTrigger) {
      // Defer so the click that closed us doesn't immediately re-open.
      requestAnimationFrame(() => triggerRef.current?.focus());
    }
  }, []);

  const openList = useCallback(() => {
    if (disabled) return;
    setHighlightIndex(selectedIndex >= 0 ? selectedIndex : findNextEnabled(options, -1, 1));
    setOpen(true);
  }, [disabled, options, selectedIndex]);

  const selectIndex = useCallback(
    (index: number) => {
      const opt = options[index];
      if (!opt || opt.disabled) return;
      onChange(opt.value as T);
      close(true);
    },
    [options, onChange, close],
  );

  // Click outside closes the list.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        close(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open, close]);

  // Scroll highlighted option into view (scrollIntoView is missing in jsdom).
  useLayoutEffect(() => {
    if (!open || highlightIndex < 0) return;
    const list = listRef.current;
    const item = list?.children[highlightIndex] as HTMLElement | undefined;
    item?.scrollIntoView?.({ block: "nearest" });
  }, [open, highlightIndex]);

  const moveHighlight = (direction: 1 | -1) => {
    setHighlightIndex((current) => {
      const next = findNextEnabled(options, current, direction);
      return next >= 0 ? next : current;
    });
  };

  const typeahead = (key: string) => {
    const state = typeaheadRef.current;
    if (state.timeout) clearTimeout(state.timeout);
    state.query = `${state.query}${key.toLowerCase()}`;
    state.timeout = setTimeout(() => {
      state.query = "";
    }, 500);

    const start = highlightIndex >= 0 ? highlightIndex + 1 : 0;
    for (let n = 0; n < options.length; n++) {
      const i = (start + n) % options.length;
      const opt = options[i];
      if (!opt.disabled && opt.label.toLowerCase().startsWith(state.query)) {
        setHighlightIndex(i);
        if (!open) {
          // When closed, typeahead jumps selection immediately (native-like).
          onChange(opt.value as T);
        }
        return;
      }
    }
  };

  const onTriggerKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (!open) openList();
        else moveHighlight(1);
        break;
      case "ArrowUp":
        e.preventDefault();
        if (!open) openList();
        else moveHighlight(-1);
        break;
      case "Home":
        if (open) {
          e.preventDefault();
          setHighlightIndex(findNextEnabled(options, -1, 1));
        }
        break;
      case "End":
        if (open) {
          e.preventDefault();
          setHighlightIndex(findNextEnabled(options, options.length, -1));
        }
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (!open) openList();
        else selectIndex(highlightIndex);
        break;
      case "Escape":
        if (open) {
          e.preventDefault();
          close(true);
        }
        break;
      case "Tab":
        if (open) close(false);
        break;
      default:
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          if (!open) openList();
          typeahead(e.key);
        }
    }
  };

  const onListKeyDown = (e: KeyboardEvent<HTMLUListElement>) => {
    // Mirror trigger handling when focus is on the listbox (rare; we keep focus on trigger).
    onTriggerKeyDown(e as unknown as KeyboardEvent<HTMLButtonElement>);
  };

  const activeDescendant =
    open && highlightIndex >= 0 ? `${listboxId}-opt-${highlightIndex}` : undefined;

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        id={id}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={activeDescendant}
        aria-labelledby={ariaLabelledBy}
        aria-label={ariaLabel}
        disabled={disabled}
        className={cn(
          "flex min-h-11 w-full items-center gap-2 rounded-md border border-opt-border bg-opt-subtle px-2.5 py-2 text-left text-base text-opt-text",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-opt-accent",
          "disabled:cursor-not-allowed disabled:opacity-60",
        )}
        onClick={() => (open ? close(true) : openList())}
        onKeyDown={onTriggerKeyDown}
      >
        <span className="flex min-w-0 flex-1 items-center gap-2">
          {selected ? (
            selected.content ? selected.content() : selected.label
          ) : (
            <span className="text-opt-muted">{placeholder}</span>
          )}
        </span>
        <svg
          aria-hidden
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-opt-muted transition-transform",
            open && "rotate-180",
          )}
          viewBox="0 0 16 16"
          fill="none"
        >
          <path
            d="M4 6l4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          tabIndex={-1}
          aria-labelledby={ariaLabelledBy}
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-opt-border bg-opt-bg py-1 shadow-md"
          onKeyDown={onListKeyDown}
        >
          {options.map((opt, index) => {
            const isSelected = opt.value === value;
            const isHighlighted = index === highlightIndex;
            return (
              <li
                key={opt.value}
                id={`${listboxId}-opt-${index}`}
                role="option"
                aria-selected={isSelected}
                aria-disabled={opt.disabled || undefined}
                className={cn(
                  "flex cursor-pointer items-center gap-2 px-2.5 py-1.5 text-base text-opt-text",
                  isHighlighted && "bg-opt-subtle",
                  isSelected && "font-semibold",
                  opt.disabled && "cursor-not-allowed opacity-50",
                )}
                onMouseEnter={() => {
                  if (!opt.disabled) setHighlightIndex(index);
                }}
                onMouseDown={(e) => {
                  // Prevent trigger blur before click handler runs.
                  e.preventDefault();
                }}
                onClick={() => {
                  if (!opt.disabled) selectIndex(index);
                }}
              >
                {opt.content ? opt.content() : opt.label}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
