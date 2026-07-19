import { create } from "zustand";
import type { ParsedDiff, PRContext, ReviewPlan, ReviewUnit } from "../../lib/types";
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
}

interface ReviewState {
  isOpen: boolean;
  status: ReviewStatus;
  error: string | null;
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

  open: () => void;
  close: () => void;
  startLoading: (sessionKey: string) => void;
  setPRContext: (prContext: PRContext) => void;
  setDiff: (diff: ParsedDiff) => void;
  beginStreaming: (generation: number) => void;
  appendUnit: (unit: ReviewUnit, generation: number) => void;
  setReady: (diff: ParsedDiff, plan: ReviewPlan, generation?: number) => void;
  setError: (message: string, generation?: number) => void;
  goToUnit: (index: number) => void;
  goNext: () => void;
  goPrev: () => void;
  setDiffViewMode: (mode: DiffViewMode) => void;
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

  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),

  startLoading: (sessionKey) =>
    set((state) => ({
      status: "loading",
      error: null,
      currentUnitIndex: 0,
      plan: null,
      diff: null,
      sessionKey,
      streamGeneration: state.streamGeneration + 1,
    })),

  setPRContext: (prContext) => set({ prContext }),

  setDiff: (diff) => set({ diff }),

  beginStreaming: (generation) => {
    if (get().streamGeneration !== generation) return;
    set({ status: "streaming", plan: { units: [] }, error: null });
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
    if (generation !== undefined && get().streamGeneration !== generation) return;
    set((state) => {
      const total = displayUnitCount(plan);
      const index = Math.min(Math.max(state.currentUnitIndex, 0), total - 1);
      return { status: "ready", diff, plan, currentUnitIndex: index, error: null };
    });
  },

  setError: (message, generation) => {
    if (generation !== undefined && get().streamGeneration !== generation) return;
    set({ status: "error", error: message });
  },

  goToUnit: (index) => {
    const total = displayUnitCount(get().plan);
    if (index < 0 || index >= total) return;
    set({ currentUnitIndex: index });
  },

  goNext: () => {
    const { currentUnitIndex, plan } = get();
    const total = displayUnitCount(plan);
    if (currentUnitIndex < total - 1) {
      set({ currentUnitIndex: currentUnitIndex + 1 });
    }
  },

  goPrev: () => {
    const { currentUnitIndex } = get();
    if (currentUnitIndex > 0) set({ currentUnitIndex: currentUnitIndex - 1 });
  },

  setDiffViewMode: (mode) => {
    // Invalidate any in-flight hydrate so it cannot clobber a user choice.
    diffViewModeHydrateEpoch += 1;
    diffViewModeHydrated = true;
    set({ diffViewMode: mode });
    void setStoredDiffViewMode(mode);
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
  const { status, diff, plan, prContext, currentUnitIndex, sessionKey } = useReviewStore.getState();
  if (status !== "ready" || !diff || !plan || !sessionKey) return;

  const payload: PersistedSession = { diff, plan, prContext, currentUnitIndex };
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
  const currentUnitIndex = Math.min(Math.max(saved.currentUnitIndex, 0), total - 1);

  useReviewStore.setState({
    status: "ready",
    diff: saved.diff,
    plan: saved.plan,
    prContext: saved.prContext ?? null,
    currentUnitIndex,
    sessionKey,
    error: null,
  });
  return true;
}
