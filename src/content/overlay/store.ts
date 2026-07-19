import { create } from "zustand";
import type { ParsedDiff, PRContext, ReviewPlan } from "../../lib/types";
import { displayUnitCount } from "./displayUnits";

export type ReviewStatus = "idle" | "loading" | "ready" | "error";

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

  open: () => void;
  close: () => void;
  startLoading: () => void;
  setPRContext: (prContext: PRContext) => void;
  setReady: (diff: ParsedDiff, plan: ReviewPlan) => void;
  setError: (message: string) => void;
  goToUnit: (index: number) => void;
  goNext: () => void;
  goPrev: () => void;
}

export const useReviewStore = create<ReviewState>((set, get) => ({
  isOpen: false,
  status: "idle",
  error: null,
  diff: null,
  plan: null,
  prContext: null,
  currentUnitIndex: 0,

  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),

  startLoading: () => set({ status: "loading", error: null, currentUnitIndex: 0, plan: null, diff: null }),

  setPRContext: (prContext) => set({ prContext }),

  setReady: (diff, plan) =>
    set((state) => {
      const total = displayUnitCount(plan);
      const index = Math.min(Math.max(state.currentUnitIndex, 0), total - 1);
      return { status: "ready", diff, plan, currentUnitIndex: index, error: null };
    }),

  setError: (message) => set({ status: "error", error: message }),

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
}));

function sessionKey(prUrl: string): string {
  return `guidedReview.session.${prUrl}`;
}

/**
 * Persist the current review session so reopening the overlay on the same PR resumes
 * without a fresh AI call. This is an optimization only — if storage access fails (e.g.
 * the access grant hasn't propagated yet), we log and move on rather than breaking the
 * review flow.
 */
export async function persistSession(prUrl: string): Promise<void> {
  const { status, diff, plan, prContext, currentUnitIndex } = useReviewStore.getState();
  if (status !== "ready" || !diff || !plan) return;

  const payload: PersistedSession = { diff, plan, prContext, currentUnitIndex };
  try {
    await chrome.storage.session.set({ [sessionKey(prUrl)]: payload });
  } catch (error) {
    console.warn("Guided Review: failed to persist session", error);
  }
}

/**
 * Attempt to restore a previously persisted session for this PR. Returns true if restored,
 * false if there's nothing to restore or storage access failed — callers should fall back
 * to starting a fresh review in either case.
 */
export async function restoreSession(prUrl: string): Promise<boolean> {
  let saved: PersistedSession | undefined;
  try {
    const result = await chrome.storage.session.get(sessionKey(prUrl));
    saved = result[sessionKey(prUrl)] as PersistedSession | undefined;
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
    error: null,
  });
  return true;
}
