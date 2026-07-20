import { create } from "zustand";
import type {
  ParsedDiff,
  PRContext,
  ReviewErrorInfo,
  ReviewPlan,
  ReviewUnit,
} from "../../lib/types";
import {
  displayLineNumber,
  linesInSelection,
  type DraftComment,
  type LineSelection,
  type SelectableLine,
  type UiMode,
} from "./commentTypes";
import { displayUnitCount } from "./displayUnits";
import {
  DEFAULT_DIFF_VIEW_MODE,
  getStoredDiffViewMode,
  setStoredDiffViewMode,
  type DiffViewMode,
} from "./diffViewMode";

export type ReviewStatus = "idle" | "loading" | "streaming" | "ready" | "error";
export type { DiffViewMode };

/** Stable identity for a PR, independent of which GitHub tab/URL the user is on. */
export interface SessionPRIdentity {
  owner: string;
  repo: string;
  number: number;
}

interface PersistedSession {
  diff: ParsedDiff;
  plan: ReviewPlan;
  prContext: PRContext | null;
  /** Index into the display unit list (0 = PR description, then plan units). */
  currentUnitIndex: number;
  /** Local draft comments (session-scoped; not posted to GitHub). */
  draftComments?: DraftComment[];
}

const COMMENT_UI_RESET = {
  uiMode: "navigate" as UiMode,
  lineSelection: null as LineSelection | null,
  composerOpen: false,
  selectableLines: [] as SelectableLine[],
};

function normalizeError(error: ReviewErrorInfo | string): ReviewErrorInfo {
  return typeof error === "string" ? { message: error } : error;
}

interface ReviewState {
  isOpen: boolean;
  status: ReviewStatus;
  error: ReviewErrorInfo | null;
  diff: ParsedDiff | null;
  plan: ReviewPlan | null;
  prContext: PRContext | null;
  /** Index into the display unit list (0 = PR description, then plan units). */
  currentUnitIndex: number;
  /**
   * Monotonic generation for the active annotation stream. Bumped on
   * startLoading so stale port events from a cancelled stream are ignored.
   */
  streamGeneration: number;
  /**
   * Canonical key for the PR whose session is in flight / restored.
   * Derived from owner/repo/number — never the full browser URL.
   */
  sessionKey: string | null;
  /** Unified vs side-by-side code view (UI preference, not session data). */
  diffViewMode: DiffViewMode;

  /** navigate = unit walkthrough; comment = line selection for drafts. */
  uiMode: UiMode;
  /** Flat selectable lines for the current unit (set when entering comment mode). */
  selectableLines: SelectableLine[];
  lineSelection: LineSelection | null;
  composerOpen: boolean;
  draftComments: DraftComment[];

  open: () => void;
  close: () => void;
  startLoading: (sessionKey: string) => void;
  setPRContext: (prContext: PRContext) => void;
  setDiff: (diff: ParsedDiff) => void;
  beginStreaming: (generation: number) => void;
  /**
   * Start a retry of the annotation stream without clearing the already-fetched
   * diff. Bumps streamGeneration and returns the new generation.
   */
  beginRetry: () => number;
  appendUnit: (unit: ReviewUnit, generation: number) => void;
  setReady: (diff: ParsedDiff, plan: ReviewPlan, generation?: number) => void;
  setError: (error: ReviewErrorInfo | string, generation?: number) => void;
  goToUnit: (index: number) => void;
  goNext: () => void;
  goPrev: () => void;
  setDiffViewMode: (mode: DiffViewMode) => void;

  enterCommentMode: (lines: SelectableLine[]) => void;
  exitCommentMode: () => void;
  /**
   * Replace the selectable-line list (e.g. after split/unified toggle).
   * Rematches anchor/focus by line id when possible; otherwise resets to the first line.
   */
  setSelectableLines: (lines: SelectableLine[]) => void;
  moveLineCursor: (delta: number, extend: boolean) => void;
  openComposer: () => void;
  closeComposer: () => void;
  saveDraftComment: (body: string, unitId?: string) => void;
  updateDraftComment: (id: string, body: string) => void;
  removeDraftComment: (id: string) => void;
}

/**
 * Build a stable session key for a PR. Same PR on Conversation vs Files changed
 * (or any other tab URL) must map to the same key so resume works.
 */
export function buildSessionKey(pr: SessionPRIdentity): string {
  return `${pr.owner}/${pr.repo}#${pr.number}`;
}

function storageKey(sessionKey: string): string {
  return `guidedReview.session.${sessionKey}`;
}

function newDraftId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `draft-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function clearCommentUi(): typeof COMMENT_UI_RESET {
  return { ...COMMENT_UI_RESET };
}

export const useReviewStore = create<ReviewState>((set, get) => ({
  isOpen: false,
  status: "idle",
  error: null,
  diff: null,
  plan: null,
  prContext: null,
  currentUnitIndex: 0,
  streamGeneration: 0,
  sessionKey: null,
  diffViewMode: DEFAULT_DIFF_VIEW_MODE,
  uiMode: "navigate",
  selectableLines: [],
  lineSelection: null,
  composerOpen: false,
  draftComments: [],

  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false, ...clearCommentUi() }),

  startLoading: (sessionKey) =>
    set((state) => ({
      status: "loading",
      error: null,
      currentUnitIndex: 0,
      plan: null,
      diff: null,
      sessionKey,
      streamGeneration: state.streamGeneration + 1,
      draftComments: [],
      ...clearCommentUi(),
    })),

  setPRContext: (prContext) => set({ prContext }),

  setDiff: (diff) => set({ diff }),

  beginStreaming: (generation) => {
    if (get().streamGeneration !== generation) return;
    set({ status: "streaming", plan: { units: [] }, error: null });
  },

  beginRetry: () => {
    const nextGeneration = get().streamGeneration + 1;
    const hasDiff = get().diff !== null;
    set({
      streamGeneration: nextGeneration,
      status: hasDiff ? "streaming" : "loading",
      error: null,
      plan: hasDiff ? { units: [] } : null,
      ...clearCommentUi(),
    });
    return nextGeneration;
  },

  appendUnit: (unit, generation) => {
    if (get().streamGeneration !== generation) return;
    set((state) => {
      const existing = state.plan?.units ?? [];
      if (existing.some((u) => u.id === unit.id)) {
        return state;
      }
      return {
        status: "streaming",
        plan: { units: [...existing, unit] },
        error: null,
      };
    });
  },

  setReady: (diff, plan, generation) => {
    if (generation !== undefined && get().streamGeneration !== generation)
      return;
    set((state) => {
      const total = displayUnitCount(plan);
      const index = Math.min(Math.max(state.currentUnitIndex, 0), total - 1);
      return {
        status: "ready",
        diff,
        plan,
        currentUnitIndex: index,
        error: null,
      };
    });
  },

  setError: (error, generation) => {
    if (generation !== undefined && get().streamGeneration !== generation)
      return;
    set({ status: "error", error: normalizeError(error) });
  },

  goToUnit: (index) => {
    const total = displayUnitCount(get().plan);
    if (index < 0 || index >= total) return;
    set({ currentUnitIndex: index, ...clearCommentUi() });
  },

  goNext: () => {
    const { currentUnitIndex, plan } = get();
    const total = displayUnitCount(plan);
    if (currentUnitIndex < total - 1) {
      set({ currentUnitIndex: currentUnitIndex + 1, ...clearCommentUi() });
    }
  },

  goPrev: () => {
    const { currentUnitIndex } = get();
    if (currentUnitIndex > 0) {
      set({ currentUnitIndex: currentUnitIndex - 1, ...clearCommentUi() });
    }
  },

  setDiffViewMode: (mode) => {
    // Invalidate any in-flight hydrate so it cannot clobber a user choice.
    diffViewModeHydrateEpoch += 1;
    diffViewModeHydrated = true;
    set({ diffViewMode: mode });
    void setStoredDiffViewMode(mode);
  },

  enterCommentMode: (lines) => {
    if (lines.length === 0) return;
    set({
      uiMode: "comment",
      selectableLines: lines,
      lineSelection: { anchorIndex: 0, focusIndex: 0 },
      composerOpen: false,
    });
  },

  exitCommentMode: () => set(clearCommentUi()),

  setSelectableLines: (lines) => {
    const { uiMode, lineSelection, selectableLines: prevLines } = get();
    if (uiMode !== "comment") {
      set({ selectableLines: lines });
      return;
    }
    if (lines.length === 0) {
      set(clearCommentUi());
      return;
    }

    // Rematch by stable line id so split↔unified (or RIGHT-only) toggles
    // keep the cursor on the same logical line when it still exists.
    let nextSelection: LineSelection = { anchorIndex: 0, focusIndex: 0 };
    let selectionPreserved = false;
    if (lineSelection) {
      const prevFocus = prevLines[lineSelection.focusIndex];
      const prevAnchor = prevLines[lineSelection.anchorIndex];
      const focusIdx = prevFocus
        ? lines.findIndex((l) => l.id === prevFocus.id)
        : -1;
      const anchorIdx = prevAnchor
        ? lines.findIndex((l) => l.id === prevAnchor.id)
        : -1;
      if (focusIdx >= 0) {
        nextSelection = {
          focusIndex: focusIdx,
          anchorIndex: anchorIdx >= 0 ? anchorIdx : focusIdx,
        };
        selectionPreserved = true;
      }
    }

    set({
      selectableLines: lines,
      lineSelection: nextSelection,
      composerOpen: selectionPreserved ? get().composerOpen : false,
    });
  },

  moveLineCursor: (delta, extend) => {
    const { uiMode, lineSelection, selectableLines, composerOpen } = get();
    if (uiMode !== "comment" || composerOpen || !lineSelection) return;
    if (selectableLines.length === 0) return;

    if (!extend) {
      const next = lineSelection.focusIndex + delta;
      if (next < 0 || next >= selectableLines.length) return;
      set({
        lineSelection: { anchorIndex: next, focusIndex: next },
      });
      return;
    }

    // Shift+arrow: jump to the next line that shares the anchor's file + side.
    const anchor = selectableLines[lineSelection.anchorIndex];
    if (!anchor) return;
    let i = lineSelection.focusIndex + delta;
    while (i >= 0 && i < selectableLines.length) {
      const candidate = selectableLines[i];
      if (
        candidate.filePath === anchor.filePath &&
        candidate.side === anchor.side
      ) {
        set({
          lineSelection: {
            anchorIndex: lineSelection.anchorIndex,
            focusIndex: i,
          },
        });
        return;
      }
      i += delta;
    }
  },

  openComposer: () => {
    const { uiMode, lineSelection, selectableLines } = get();
    if (uiMode !== "comment" || !lineSelection) return;
    if (linesInSelection(selectableLines, lineSelection).length === 0) return;
    set({ composerOpen: true });
  },

  closeComposer: () => set({ composerOpen: false }),

  saveDraftComment: (body, unitId) => {
    const trimmed = body.trim();
    if (!trimmed) return;

    const { uiMode, lineSelection, selectableLines, draftComments } = get();
    if (uiMode !== "comment" || !lineSelection) return;

    const selected = linesInSelection(selectableLines, lineSelection);
    if (selected.length === 0) return;

    const first = selected[0];
    const last = selected[selected.length - 1];
    const startNum = displayLineNumber(first);
    const endNum = displayLineNumber(last);
    if (startNum === undefined || endNum === undefined) return;

    const draft: DraftComment = {
      id: newDraftId(),
      filePath: first.filePath,
      side: first.side,
      startLine: Math.min(startNum, endNum),
      endLine: Math.max(startNum, endNum),
      lineIds: selected.map((l) => l.id),
      body: trimmed,
      unitId,
    };

    set({
      draftComments: [...draftComments, draft],
      composerOpen: false,
    });
  },

  updateDraftComment: (id, body) => {
    const trimmed = body.trim();
    if (!trimmed) return;
    set((state) => ({
      draftComments: state.draftComments.map((d) =>
        d.id === id ? { ...d, body: trimmed } : d,
      ),
    }));
  },

  removeDraftComment: (id) => {
    set((state) => ({
      draftComments: state.draftComments.filter((d) => d.id !== id),
    }));
  },
}));

/** Bumped when the user sets a mode so pending storage reads are dropped. */
let diffViewModeHydrateEpoch = 0;
let diffViewModeHydrated = false;
let diffViewModeHydrateInFlight: Promise<void> | null = null;

/**
 * Hydrate the diff view mode preference from chrome.storage.local.
 * Safe to call multiple times; runs at most once unless reset for tests.
 * In-flight reads are discarded if the user changes mode first.
 */
export async function hydrateDiffViewMode(): Promise<void> {
  if (diffViewModeHydrated) return;
  if (diffViewModeHydrateInFlight) return diffViewModeHydrateInFlight;

  const epoch = diffViewModeHydrateEpoch;
  diffViewModeHydrateInFlight = (async () => {
    try {
      const mode = await getStoredDiffViewMode();
      if (epoch !== diffViewModeHydrateEpoch) return;
      useReviewStore.setState({ diffViewMode: mode });
      diffViewModeHydrated = true;
    } finally {
      diffViewModeHydrateInFlight = null;
    }
  })();

  return diffViewModeHydrateInFlight;
}

/** Test helper: allow hydrateDiffViewMode to run again after store resets. */
export function resetDiffViewModeHydrationForTests(): void {
  diffViewModeHydrateEpoch = 0;
  diffViewModeHydrated = false;
  diffViewModeHydrateInFlight = null;
}

/**
 * Persist the current review session so reopening the overlay on the same PR resumes
 * without a fresh AI call. This is an optimization only — if storage access fails (e.g.
 * the access grant hasn't propagated yet), we log and move on rather than breaking the
 * review flow.
 */
export async function persistSession(): Promise<void> {
  const {
    status,
    diff,
    plan,
    prContext,
    currentUnitIndex,
    sessionKey,
    draftComments,
  } = useReviewStore.getState();
  if (status !== "ready" || !diff || !plan || !sessionKey) return;

  const payload: PersistedSession = {
    diff,
    plan,
    prContext,
    currentUnitIndex,
    draftComments,
  };
  try {
    await chrome.storage.session.set({ [storageKey(sessionKey)]: payload });
  } catch (error) {
    console.warn("Guided Review: failed to persist session", error);
  }
}

/**
 * Attempt to restore a previously persisted session for this PR. Returns true if restored,
 * false if there's nothing to restore or storage access failed — callers should fall back
 * to starting a fresh review in either case.
 */
export async function restoreSession(sessionKey: string): Promise<boolean> {
  let saved: PersistedSession | undefined;
  try {
    const result = await chrome.storage.session.get(storageKey(sessionKey));
    saved = result[storageKey(sessionKey)] as PersistedSession | undefined;
  } catch (error) {
    console.warn("Guided Review: failed to restore session", error);
    return false;
  }
  if (!saved) return false;

  const total = displayUnitCount(saved.plan);
  const currentUnitIndex = Math.min(
    Math.max(saved.currentUnitIndex, 0),
    total - 1,
  );

  useReviewStore.setState({
    status: "ready",
    diff: saved.diff,
    plan: saved.plan,
    prContext: saved.prContext ?? null,
    currentUnitIndex,
    sessionKey,
    error: null,
    draftComments: saved.draftComments ?? [],
    ...clearCommentUi(),
  });
  return true;
}
