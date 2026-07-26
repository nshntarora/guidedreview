import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { formatLineRangeLabel } from "../commentTypes";
import { Button, Kbd, Textarea } from "@guided-review/ui";
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
      className="border border-border bg-background px-3 py-3"
      data-testid="comment-composer"
      role="form"
      aria-label="Draft review comment"
    >
      <div className="mb-2 font-mono text-sm text-muted">
        {formatLineRangeLabel(filePath, startLine, endLine)}
      </div>
      <Textarea
        ref={textareaRef}
        placeholder="Line comment (markdown supported)…"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={handleKeyDown}
        aria-label="Comment body"
        data-testid="comment-composer-input"
      />
      <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
        <Button variant="secondary" size="sm" onClick={onCancel}>
          Cancel
          <Kbd>Esc</Kbd>
        </Button>
        <Button
          size="sm"
          disabled={!canSave}
          onClick={() => {
            if (canSave) onSave(body);
          }}
          data-testid="comment-composer-save"
          className="disabled:opacity-40"
        >
          Save Draft
          <ModEnterChord />
        </Button>
      </div>
    </div>
  );
}
