import { useReviewStore } from "../../store";
import type { DraftComment } from "../../commentTypes";
import { CommentComposer } from "../CommentComposer";
import { confirm } from "../confirmation";
import { DraftCommentCard } from "../DraftCommentCard";
import type { ComposerRange } from "./hunkStyles";

interface LineExtrasProps {
  lineId: string;
  draftsByEndLineId: Map<string, DraftComment[]>;
  composerPlacementId: string | null;
  composerRange: ComposerRange;
  unitId?: string;
}

export function LineExtras({
  lineId,
  draftsByEndLineId,
  composerPlacementId,
  composerRange,
  unitId,
}: LineExtrasProps) {
  const saveDraftComment = useReviewStore((s) => s.saveDraftComment);
  const closeComposer = useReviewStore((s) => s.closeComposer);
  const removeDraftComment = useReviewStore((s) => s.removeDraftComment);
  const updateDraftComment = useReviewStore((s) => s.updateDraftComment);
  const drafts = draftsByEndLineId.get(lineId) ?? [];
  const showComposer = composerPlacementId === lineId && composerRange;

  if (!showComposer && drafts.length === 0) return null;

  function requestRemoveDraft(id: string): void {
    confirm({
      title: "Remove Comment?",
      body: "This comment will be removed. You can comment on these lines again later.",
      variant: "destructive",
      okButtonText: "Remove",
      cancelButtonText: "Cancel",
      okButtonHandler: () => {
        removeDraftComment(id);
      },
    });
  }

  return (
    <div className="font-sans" data-testid={`line-extras-${lineId}`}>
      {drafts.map((d) => (
        <DraftCommentCard
          key={d.id}
          comment={d}
          onRemove={requestRemoveDraft}
          onUpdate={updateDraftComment}
        />
      ))}
      {showComposer && (
        <CommentComposer
          filePath={composerRange.filePath}
          startLine={composerRange.startLine}
          endLine={composerRange.endLine}
          onSave={(body) => saveDraftComment(body, unitId)}
          onCancel={closeComposer}
        />
      )}
    </div>
  );
}
