import { confirm } from "@guided-review/ui";
import { useReviewStore } from "@guided-review/ui/review/store";
import { DraftCommentCard } from "./DraftCommentCard";

/** Recoverable feedback is deliberately separate from code-line placement. */
export function UnresolvedNotes() {
  const drafts = useReviewStore((state) => state.draftComments);
  const unresolved = drafts.filter((draft) => draft.unresolved);
  if (unresolved.length === 0) return null;
  return (
    <section
      className="mt-5 space-y-3"
      aria-label="Unresolved notes"
      data-testid="unresolved-notes"
    >
      <h2 className="m-0 text-base font-semibold text-warning">
        Unresolved notes ({unresolved.length})
      </h2>
      <p className="m-0 text-sm text-muted">
        These notes no longer match the diff. Recreate them on the current code, then remove the
        originals. Generate Prompt includes them with their captured source.
      </p>
      {unresolved.map((comment) => (
        <div key={comment.id} data-testid="unresolved-note">
          <pre
            className="m-0 max-h-40 overflow-auto whitespace-pre-wrap border border-border p-2 text-xs text-muted"
            data-testid="unresolved-note-source"
          >
            {comment.selectedCode}
          </pre>
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
    </section>
  );
}
