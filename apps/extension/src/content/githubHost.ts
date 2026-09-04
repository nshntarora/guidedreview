/**
 * Chrome/GitHub implementation of ReviewHost. The only overlay-adjacent
 * module allowed to touch chrome messaging, storage, and GitHub URLs.
 */

import type { ReviewContext } from "@guided-review/core";
import type { PRContext } from "@extension/lib/types";
import {
  getGitHubAuthStatus,
  openOptionsPage,
  requestSubmitReview,
  streamReviewPlan,
} from "@extension/lib/messaging";
import { getStoredDiffViewMode, setStoredDiffViewMode } from "@extension/lib/preferences";
import { readSession, writeSession } from "@extension/lib/storage";
import { requestFilePreview } from "@extension/lib/messaging";
import {
  buildFileLineUrl,
  buildPRFileDiffUrl,
  navigateToPrConversation,
  pullHeadRef,
} from "@extension/lib/github/prUrls";
import type { ReviewHost } from "./overlay/host";

function sessionStorageKey(sessionKey: string): string {
  return `guidedReview.session.${sessionKey}`;
}

function githubIdentity(context: ReviewContext): {
  owner: string;
  repo: string;
  number: number;
} | null {
  if (
    typeof context.owner !== "string" ||
    typeof context.repo !== "string" ||
    typeof context.number !== "number"
  ) {
    return null;
  }
  return { owner: context.owner, repo: context.repo, number: context.number };
}

export function createGitHubReviewHost(): ReviewHost {
  return {
    kind: "github",
    assetUrl: (path) => chrome.runtime.getURL(path),
    persistSession: async (key, data) => {
      await writeSession(sessionStorageKey(key), data);
    },
    restoreSession: async (key) => {
      return readSession(sessionStorageKey(key), (raw) => (raw ?? null) as unknown);
    },
    streamPlan: (diff, context, handlers) => {
      // Annotate messages require GitHub PR identity. This host only runs on a
      // parsed PR page, where context is always PRContext.
      return streamReviewPlan(diff, context as PRContext, handlers);
    },
    connectProvider: () => {
      void openOptionsPage();
    },
    persistDiffViewMode: setStoredDiffViewMode,
    readDiffViewMode: getStoredDiffViewMode,
    fileDiffUrl: async (filePath, context) => {
      const pr = githubIdentity(context);
      if (!pr) return null;
      return buildPRFileDiffUrl(pr, filePath);
    },
    fileLineUrl: async (filePath, line, context) => {
      const pr = githubIdentity(context);
      if (!pr) return null;
      return buildFileLineUrl(pr, { filePath, line, headRef: context.headRef });
    },
    filePreviewUrl: async ({ path, previousPath, side, context }) => {
      const pr = githubIdentity(context);
      if (!pr) return null;
      const filePath = side === "old" ? (previousPath ?? path) : path;
      const ref = side === "new" ? pullHeadRef(pr.number) : context.baseRef.trim();
      if (!ref) return null;
      try {
        const result = await requestFilePreview(pr, filePath, ref);
        return result?.ok ? result.dataUrl : null;
      } catch {
        return null;
      }
    },
    submit: {
      getAuthStatus: getGitHubAuthStatus,
      submitReview: requestSubmitReview,
      afterSubmit: (context) => {
        const pr = githubIdentity(context);
        if (pr) navigateToPrConversation(pr);
      },
    },
  };
}
