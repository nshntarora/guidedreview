import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { formatLineRangeLabel, type DraftComment } from "../commentTypes";
import { Kbd } from "./Kbd";
import { ModEnterChord } from "./ShortcutKeys";

interface DraftCommentCardProps {
  comment: DraftComment;
  onRemove: (id: string) => void;
  onUpdate: (id: string, body: string) => void;
}

/** Compact local draft shown under the commented line range. */
export function DraftCommentCard({
  comment,
  onRemove,
  onUpdate,
}: DraftCommentCardProps) {
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
      className="border-y border-gr-border bg-gr-bg px-3 py-2.5"
      data-testid="draft-comment"
      data-draft-id={comment.id}
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="font-mono text-[11px] text-gr-muted">
          Draft · {formatLineRangeLabel(comment.filePath, comment.startLine, comment.endLine)}
        </span>
        <div className="flex items-center gap-1">
          {!editing && (
            <button
              type="button"
              className="min-h-9 min-w-9 cursor-pointer rounded px-2 py-1.5 text-[12px] text-gr-muted hover:bg-gr-subtle hover:text-gr-text"
              onClick={() => setEditing(true)}
              aria-label="Edit draft comment"
              data-testid="draft-comment-edit"
            >
              Edit
            </button>
          )}
          <button
            type="button"
            className="min-h-9 min-w-9 cursor-pointer rounded px-2 py-1.5 text-[12px] text-gr-muted hover:bg-gr-subtle hover:text-gr-text"
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
          <textarea
            ref={textareaRef}
            className="min-h-[88px] w-full resize-y rounded-md border border-gr-border bg-gr-chrome px-3 py-2 font-sans text-[14px] leading-relaxed text-gr-text placeholder:text-gr-faint focus:border-gr-accent"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={handleKeyDown}
            aria-label="Edit comment body"
            data-testid="draft-comment-edit-input"
          />
          <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-md border border-gr-border bg-gr-chrome px-3 py-2 text-[13px] text-gr-muted hover:bg-gr-subtle hover:text-gr-text"
              onClick={exitEdit}
              data-testid="draft-comment-edit-cancel"
            >
              Cancel
              <Kbd>Esc</Kbd>
            </button>
            <button
              type="button"
              className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-md border border-gr-accent bg-gr-accent px-3 py-2 text-[13px] font-medium text-gr-accent-on enabled:hover:border-gr-accent-hover enabled:hover:bg-gr-accent-hover disabled:cursor-not-allowed disabled:opacity-40 [&_kbd]:border-[rgba(13,8,6,0.25)] [&_kbd]:bg-[rgba(13,8,6,0.08)] [&_kbd]:text-inherit"
              disabled={!canSave}
              onClick={saveEdit}
              data-testid="draft-comment-edit-save"
            >
              Save
              <ModEnterChord />
            </button>
          </div>
        </>
      ) : (
        <div
          className="whitespace-pre-wrap font-sans text-[14px] leading-relaxed text-gr-text"
          data-testid="draft-comment-body"
        >
          {comment.body}
        </div>
      )}
    </div>
  );
}
