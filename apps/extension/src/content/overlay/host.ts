/**
 * Host adapter for the review overlay. Chrome/GitHub (and later the CLI)
 * implement this; overlay components must not import `chrome.*`.
 */

import { createContext, createElement, useContext, type ReactNode } from "react";
import type {
  ParsedDiff,
  ReviewContext,
  ReviewErrorInfo,
  ReviewPlan,
  ReviewUnit,
  SubmitReviewResponse,
} from "@extension/lib/types";
import type { ReviewCommentInput, ReviewEvent } from "@extension/lib/types";
import type { DiffViewMode } from "./diffView";
import type { DraftComment } from "./commentTypes";

export interface StreamPlanHandlers {
  onUnit: (unit: ReviewUnit) => void;
  onDone: (plan: ReviewPlan) => void;
  onError: (error: ReviewErrorInfo) => void;
  onStatus?: (phase: "waiting_for_tokens" | "tokens_streaming") => void;
}

export interface ReviewSubmitAuth {
  login: string;
  avatarUrl?: string;
  name?: string;
}

export interface ReviewHostSubmit {
  getAuthStatus(): Promise<{ ok: true; auth: ReviewSubmitAuth | null }>;
  submitReview(
    pr: { owner: string; repo: string; number: number },
    body: string,
    event: ReviewEvent,
    comments: ReviewCommentInput[],
  ): Promise<SubmitReviewResponse>;
  afterSubmit?(context: ReviewContext): void;
}

export interface ReviewHost {
  kind: "github" | "local";
  assetUrl(path: string): string;
  persistSession(key: string, data: unknown): Promise<void>;
  restoreSession(key: string): Promise<unknown | null>;
  streamPlan(
    diff: ParsedDiff,
    context: ReviewContext,
    handlers: StreamPlanHandlers,
  ): { cancel(): void };
  connectProvider(): void;
  persistDiffViewMode?(mode: DiffViewMode): Promise<void>;
  readDiffViewMode?(): Promise<DiffViewMode>;
  fileDiffUrl?(filePath: string, context: ReviewContext): Promise<string | null>;
  fileLineUrl?(filePath: string, line: number, context: ReviewContext): Promise<string | null>;
  submit?: ReviewHostSubmit;
  exportNotes?: (drafts: DraftComment[]) => void | Promise<void>;
}

const ReviewHostContext = createContext<ReviewHost | null>(null);

let activeHost: ReviewHost | null = null;

export function setActiveReviewHost(host: ReviewHost | null): void {
  activeHost = host;
}

export function getActiveReviewHost(): ReviewHost | null {
  return activeHost;
}

export function ReviewHostProvider({ host, children }: { host: ReviewHost; children: ReactNode }) {
  setActiveReviewHost(host);
  return createElement(ReviewHostContext.Provider, { value: host }, children);
}

export function useReviewHost(): ReviewHost {
  const fromContext = useContext(ReviewHostContext);
  const host = fromContext ?? activeHost;
  if (!host) {
    throw new Error("ReviewHost is not set. Wrap the overlay in ReviewHostProvider.");
  }
  return host;
}

/** In-memory host for unit tests. */
export function createMemoryReviewHost(overrides: Partial<ReviewHost> = {}): ReviewHost {
  const sessions = new Map<string, unknown>();
  let diffViewMode: DiffViewMode = "split";
  return {
    kind: "github",
    assetUrl: (path) => path,
    persistSession: async (key, data) => {
      sessions.set(key, data);
    },
    restoreSession: async (key) => sessions.get(key) ?? null,
    streamPlan: () => ({ cancel() {} }),
    connectProvider: () => {},
    persistDiffViewMode: async (mode) => {
      diffViewMode = mode;
    },
    readDiffViewMode: async () => diffViewMode,
    ...overrides,
  };
}
