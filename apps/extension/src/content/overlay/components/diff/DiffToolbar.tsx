import { cn, Kbd } from "@guided-review/ui";
import type { DiffViewMode } from "@extension/lib/preferences";
import { ShortcutKeys } from "@extension/content/overlay/components/ShortcutKeys";

export function DiffViewToggle({
  mode,
  onChange,
}: {
  mode: DiffViewMode;
  onChange: (mode: DiffViewMode) => void;
}) {
  return (
    <div
      className="flex shrink-0 items-center"
      role="group"
      aria-label="Diff view"
      data-testid="diff-view-toggle"
    >
      <div className="inline-flex overflow-hidden rounded-md border border-border bg-surface">
        <button
          type="button"
          className={cn(
            "inline-flex cursor-pointer items-center gap-1.5 px-3 py-1.5 text-base transition-colors",
            mode === "unified"
              ? "bg-surface-muted text-foreground"
              : "bg-transparent text-muted hover:bg-surface-muted hover:text-foreground",
          )}
          aria-pressed={mode === "unified"}
          onClick={() => onChange("unified")}
        >
          Unified
          <span aria-hidden="true">
            <ShortcutKeys keys={["v", "u"]} join="sequence" />
          </span>
        </button>
        <button
          type="button"
          className={cn(
            "inline-flex cursor-pointer items-center gap-1.5 border-l border-border px-3 py-1.5 text-base transition-colors",
            mode === "split"
              ? "bg-surface-muted text-foreground"
              : "bg-transparent text-muted hover:bg-surface-muted hover:text-foreground",
          )}
          aria-pressed={mode === "split"}
          onClick={() => onChange("split")}
        >
          Split
          <span aria-hidden="true">
            <ShortcutKeys keys={["v", "s"]} join="sequence" />
          </span>
        </button>
      </div>
    </div>
  );
}

export function CommentModeChip() {
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-primary/40 bg-primary-muted px-2.5 py-1 text-sm text-primary"
      data-testid="comment-mode-chip"
    >
      Comment Mode
      <span className="inline-flex items-center gap-1 text-muted">
        · <Kbd>Esc</Kbd> exits
      </span>
    </span>
  );
}

export function AddCommentButton({
  disabled,
  onEnter,
}: {
  disabled: boolean;
  onEnter: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-base transition-colors",
        disabled
          ? "cursor-not-allowed bg-surface text-faint opacity-60"
          : "cursor-pointer bg-surface text-foreground hover:bg-surface-muted",
      )}
      disabled={disabled}
      data-testid="enter-comment-mode"
      onClick={() => {
        if (disabled) return;
        onEnter();
      }}
    >
      Add Comment
      <span aria-hidden="true">
        <Kbd>c</Kbd>
      </span>
    </button>
  );
}
