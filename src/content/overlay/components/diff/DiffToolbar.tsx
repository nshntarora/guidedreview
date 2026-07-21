import { cn } from "../../../../lib/cn";
import type { DiffViewMode } from "../../diffViewMode";
import { Kbd } from "../Kbd";
import { ShortcutKeys } from "../ShortcutKeys";

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
      <div className="inline-flex overflow-hidden rounded-md border border-gr-border bg-gr-bg">
        <button
          type="button"
          className={cn(
            "inline-flex cursor-pointer items-center gap-1.5 px-3 py-1.5 text-base transition-colors",
            mode === "unified"
              ? "bg-gr-subtle text-gr-text"
              : "bg-transparent text-gr-muted hover:bg-gr-subtle hover:text-gr-text",
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
            "inline-flex cursor-pointer items-center gap-1.5 border-l border-gr-border px-3 py-1.5 text-base transition-colors",
            mode === "split"
              ? "bg-gr-subtle text-gr-text"
              : "bg-transparent text-gr-muted hover:bg-gr-subtle hover:text-gr-text",
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
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-gr-accent/40 bg-gr-accent-subtle px-2.5 py-1 text-sm text-gr-accent"
      data-testid="comment-mode-chip"
    >
      Comment Mode
      <span className="inline-flex items-center gap-1 text-gr-muted">
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
        "inline-flex shrink-0 items-center gap-1.5 rounded-md border border-gr-border px-3 py-1.5 text-base transition-colors",
        disabled
          ? "cursor-not-allowed bg-gr-bg text-gr-faint opacity-60"
          : "cursor-pointer bg-gr-bg text-gr-text hover:bg-gr-subtle",
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
