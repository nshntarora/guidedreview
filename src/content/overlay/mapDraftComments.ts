import type { ReviewCommentInput } from "../../lib/types";
import type { DraftComment } from "./commentTypes";

/** Map local draft comments to GitHub create-review `comments[]` payloads. */
export function mapDraftsToReviewComments(
  drafts: DraftComment[],
): ReviewCommentInput[] {
  return drafts.map((draft) => {
    const comment: ReviewCommentInput = {
      path: draft.filePath,
      body: draft.body,
      side: draft.side,
      line: draft.endLine,
    };
    if (draft.startLine !== draft.endLine) {
      comment.startLine = draft.startLine;
      comment.startSide = draft.side;
    }
    return comment;
  });
}
