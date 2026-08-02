import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { formatLineRangeLabel, type DraftComment } from "@extension/content/overlay/commentTypes";
import { Button, Kbd, Textarea } from "@guided-review/ui";
import { ModEnterChord } from "./ShortcutKeys";

interface DraftCommentCardProps {
  comment: DraftComment;
  onRemove: (id: string) => void;
  onUpdate: (id: string, body: string) => void;
}

/** Compact local draft shown under the commented line range. */
export function DraftCommentCard({ comment, onRemove, onUpdate }: DraftCommentCardProps) {
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(comment.body);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!editing) return;
    setBody(comment.body);
    textareaRef.current?.focus();
    // Move caret to end so the user can keep typing.
    const el = textareaRef.current;
    if (el) {
      const len = el.value.length;
      el.setSelectionRange(len, len);
    }
  }, [editing, comment.body]);

  const canSave = body.trim().length > 0;

  function exitEdit(): void {
    setEditing(false);
    setBody(comment.body);
  }

  function saveEdit(): void {
    if (!canSave) return;
    onUpdate(comment.id, body);
    setEditing(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>): void {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      exitEdit();
      return;
    }
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      event.stopPropagation();
      if (canSave) saveEdit();
    }
  }

  return (
    <div
      className="border-y border-border bg-surface px-3 py-2.5"
      data-testid="draft-comment"
      data-draft-id={comment.id}
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="font-mono text-xs text-muted">
          Draft · {formatLineRangeLabel(comment.filePath, comment.startLine, comment.endLine)}
        </span>
        <div className="flex items-center gap-1">
          {!editing && (
            <button
              type="button"
              className="cursor-pointer rounded px-1.5 py-0.5 text-sm text-muted hover:bg-surface-muted hover:text-foreground"
              onClick={() => setEditing(true)}
              aria-label="Edit draft comment"
              data-testid="draft-comment-edit"
            >
              Edit
            </button>
          )}
          <button
            type="button"
            className="cursor-pointer rounded px-1.5 py-0.5 text-sm text-muted hover:bg-surface-muted hover:text-foreground"
            onClick={() => onRemove(comment.id)}
            aria-label="Remove draft comment"
            data-testid="draft-comment-remove"
          >
            Remove
          </button>
        </div>
      </div>
      {editing ? (
        <>
          <Textarea
            ref={textareaRef}
            className="bg-background"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={handleKeyDown}
            aria-label="Edit comment body"
            data-testid="draft-comment-edit-input"
          />
          <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="bg-background"
              onClick={exitEdit}
              data-testid="draft-comment-edit-cancel"
            >
              Cancel
              <Kbd>Esc</Kbd>
            </Button>
            <Button
              size="sm"
              disabled={!canSave}
              onClick={saveEdit}
              data-testid="draft-comment-edit-save"
              className="disabled:opacity-40"
            >
              Save
              <ModEnterChord />
            </Button>
          </div>
        </>
      ) : (
        <div
          className="whitespace-pre-wrap font-sans text-base leading-relaxed text-foreground"
          data-testid="draft-comment-body"
        >
          {comment.body}
        </div>
      )}
    </div>
  );
}
