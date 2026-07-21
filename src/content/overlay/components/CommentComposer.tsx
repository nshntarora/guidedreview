import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { formatLineRangeLabel } from "../commentTypes";
import { Kbd } from "./Kbd";
import { ModEnterChord } from "./ShortcutKeys";

interface CommentComposerProps {
  filePath: string;
  startLine: number;
  endLine: number;
  onSave: (body: string) => void;
  onCancel: () => void;
}

/**
 * Inline markdown draft composer. Enter inserts a newline;
 * ⌘/Ctrl+Enter saves; Esc cancels.
 */
export function CommentComposer({
  filePath,
  startLine,
  endLine,
  onSave,
  onCancel,
}: CommentComposerProps) {
  const [body, setBody] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const canSave = body.trim().length > 0;

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>): void {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onCancel();
      return;
    }
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      event.stopPropagation();
      if (canSave) onSave(body);
    }
  }

  return (
    <div
      className="border border-gr-border bg-gr-chrome px-3 py-3"
      data-testid="comment-composer"
      role="form"
      aria-label="Draft review comment"
    >
      <div className="mb-2 font-mono text-sm text-gr-muted">
        {formatLineRangeLabel(filePath, startLine, endLine)}
      </div>
      <textarea
        ref={textareaRef}
        className="min-h-[88px] w-full resize-y rounded-md border border-gr-border bg-gr-bg px-3 py-2 font-sans text-base leading-relaxed text-gr-text placeholder:text-gr-faint focus:border-gr-accent"
        placeholder="Line comment (markdown supported)…"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={handleKeyDown}
        aria-label="Comment body"
        data-testid="comment-composer-input"
      />
      <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-gr-border bg-gr-bg px-3 py-1.5 text-base text-gr-muted hover:bg-gr-subtle hover:text-gr-text"
          onClick={onCancel}
        >
          Cancel
          <Kbd>Esc</Kbd>
        </button>
        <button
          type="button"
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-gr-accent bg-gr-accent px-3 py-1.5 text-base font-medium text-gr-accent-on enabled:hover:border-gr-accent-hover enabled:hover:bg-gr-accent-hover disabled:cursor-not-allowed disabled:opacity-40 [&_kbd]:border-[rgba(13,8,6,0.25)] [&_kbd]:bg-[rgba(13,8,6,0.08)] [&_kbd]:text-inherit"
          disabled={!canSave}
          onClick={() => {
            if (canSave) onSave(body);
          }}
          data-testid="comment-composer-save"
        >
          Save Draft
          <ModEnterChord />
        </button>
      </div>
    </div>
  );
}
