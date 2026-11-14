import { confirm } from "@guided-review/ui";
import { useReviewStore } from "@guided-review/ui/review/store";
import { DraftCommentCard } from "./DraftCommentCard";

/** Recoverable feedback is deliberately separate from code-line placement. */
export function UnresolvedNotes({ filePath }: { filePath?: string }) {
  const drafts = useReviewStore((state) => state.draftComments);
  const unresolved = drafts.filter(
    (draft) => draft.unresolved && (!filePath || draft.filePath === filePath),
  );
  if (unresolved.length === 0)
    return filePath ? null : <p className="p-4 text-sm text-muted">No unresolved notes.</p>;
  return (
    <section
      className="flex flex-col gap-4 rounded-t-lg border-b border-border bg-background p-4"
      aria-label="Unresolved notes"
      data-testid="unresolved-notes"
    >
      <header className="flex flex-col gap-2">
        <h2 className="m-0 text-sm font-semibold text-warning">
          Unresolved notes ({unresolved.length})
        </h2>
        <p className="m-0 text-sm text-muted">
          Your notes are saved. These couldn’t be placed because the source changed. Recreate them
          on the current code, then remove the originals.
        </p>
      </header>
      <div className="flex flex-col gap-3">
        {unresolved.map((comment) => (
          <div
            key={comment.id}
            className="overflow-hidden rounded-lg border border-border"
            data-testid="unresolved-note"
          >
            <details className="bg-surface-muted px-3 py-2">
              <summary className="cursor-pointer text-xs text-muted">
                Captured source · {comment.filePath}:{comment.startLine}
              </summary>
              <pre
                className="mb-0 mt-2 max-h-40 overflow-auto whitespace-pre-wrap font-mono text-xs text-muted"
                data-testid="unresolved-note-source"
              >
                {comment.selectedCode}
              </pre>
            </details>
            <DraftCommentCard
              comment={comment}
              onUpdate={useReviewStore.getState().updateDraftComment}
              onRemove={(id) =>
                confirm({
                  title: "Remove this note?",
                  body: "This removes the saved note and its captured source.",
                  variant: "destructive",
                  okButtonText: "Remove",
                  okButtonHandler: () => useReviewStore.getState().removeDraftComment(id),
                })
              }
            />
          </div>
        ))}
      </div>
    </section>
  );
}
