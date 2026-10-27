import { create } from "zustand";
import type {
  ParsedDiff,
  ReviewErrorInfo,
  ReviewPlan,
  ReviewUnit,
} from "@guided-review/ui/review/types";
import type { ReviewContext } from "@guided-review/core";
import { NO_API_KEY_ERROR_CODE } from "@guided-review/ui/review/types";
import type { PRIdentity } from "@guided-review/ui/review/types";
import { buildFileReviewPlan } from "@guided-review/core";
import { orderedFiles } from "./fileNavigation";
import {
  displayLineNumber,
  linesInSelection,
  type DraftComment,
  type LineSelection,
  type SelectableLine,
  type UiMode,
} from "./commentTypes";
import { DEFAULT_DIFF_VIEW_MODE, type DiffViewMode } from "./diffView";
import { getActiveReviewHost } from "./host";

export type ReviewStatus = "idle" | "loading" | "streaming" | "ready" | "error";

/** File fallback data is separate from an AI review plan. */
export type PlanSource = "files" | "ai";

/**
 * Fine-grained progress while the review plan is being built (diff fetch →
 * provider stream). Orthogonal to coarse `status`; cleared when ready/error.
 */
export type BuildPhase =
  | "extracting_diff"
  | "processing_diff"
  | "sent_to_provider"
  | "waiting_for_tokens"
  | "tokens_streaming";

export type { DiffViewMode };

/** Display list unit: synthetic change summary first, then plan units. */
export type DisplayUnit =
  | { kind: "pr_description"; id: "__pr_description"; title: string }
  | { kind: "review"; id: string; title: string; unit: ReviewUnit; planIndex: number };

export function summaryUnitTitle(kind: "github" | "local" = "github"): string {
  return kind === "local" ? "Commits" : "PR Description";
}

/** Ordered units shown in the overlay (description is UI-only, not model output). */
export function buildDisplayUnits(
  plan: ReviewPlan | null,
  hostKind: "github" | "local" = "github",
): DisplayUnit[] {
  const description: DisplayUnit = {
    kind: "pr_description",
    id: "__pr_description",
    title: summaryUnitTitle(hostKind),
  };
  if (!plan) return [description];
  return [
    description,
    ...plan.units.map((unit, planIndex): DisplayUnit => ({
      kind: "review",
      id: unit.id,
      title: unit.title,
      unit,
      planIndex,
    })),
  ];
}

/** Navigable display unit count (always at least 1 for the description). */
export function displayUnitCount(plan: ReviewPlan | null): number {
  return 1 + (plan?.units.length ?? 0);
}

export type NavigationMode = "files" | "units";
export type ContentSelection =
  { kind: "summary" } | { kind: "file"; path: string } | { kind: "unit"; id: string };

export function selectionKey(selection: ContentSelection): string {
  return selection.kind === "summary"
    ? "summary"
    : selection.kind === "file"
      ? `file:${selection.path}`
      : `unit:${selection.id}`;
}

interface PendingComposer {
  lines: SelectableLine[];
  body: string;
}

interface PersistedSession {
  diff: ParsedDiff;
  plan?: ReviewPlan | null;
  planSource?: PlanSource | null;
  planComplete?: boolean;
  prContext: ReviewContext | null;
  /** Legacy sessions used an index including the description at zero. */
  currentUnitIndex?: number;
  currentFileIndex?: number;
  selection?: ContentSelection;
  navigationMode?: NavigationMode;
  lastFileSelection?: ContentSelection | null;
  lastUnitSelection?: ContentSelection | null;
  collapsedDirectories?: Record<string, boolean>;
  scrollPositions?: Record<string, number>;
  pendingComposers?: Record<string, PendingComposer>;
  draftComments?: DraftComment[];
}

const NAVIGATION_RESET = {
  selection: { kind: "summary" } as ContentSelection,
  navigationMode: "files" as NavigationMode,
  lastFileSelection: null as ContentSelection | null,
  lastUnitSelection: null as ContentSelection | null,
  collapsedDirectories: {} as Record<string, boolean>,
  scrollPositions: {} as Record<string, number>,
  pendingComposers: {} as Record<string, PendingComposer>,
};

function composerKey(lines: SelectableLine[]): string {
  return JSON.stringify(lines.map((line) => line.id));
}

const COMMENT_UI_RESET = {
  uiMode: "navigate" as UiMode,
  lineSelection: null as LineSelection | null,
  composerOpen: false,
  composerText: "",
  composerAutoFocus: false,
  selectableLines: [] as SelectableLine[],
};

interface ReviewState {
  isOpen: boolean;
  status: ReviewStatus;
  error: ReviewErrorInfo | null;
  /**
   * Provider readiness is independent of the diff and any cached AI plan.
   */
  needsProvider: boolean;
  /** Pipeline sub-status while loading/streaming; null when idle/ready/error. */
  buildPhase: BuildPhase | null;
  /** Catalog display name of the configured provider (for "Sent it to …" copy). */
  providerLabel: string | null;
  diff: ParsedDiff | null;
  plan: ReviewPlan | null;
  prContext: ReviewContext | null;
  selection: ContentSelection;
  navigationMode: NavigationMode;
  lastFileSelection: ContentSelection | null;
  lastUnitSelection: ContentSelection | null;
  collapsedDirectories: Record<string, boolean>;
  scrollPositions: Record<string, number>;
  selectContent: (selection: ContentSelection, mode?: NavigationMode) => void;
  setNavigationMode: (mode: NavigationMode) => void;
  goToFile: (path: string) => void;
  toggleDirectory: (path: string) => void;
  saveScrollPosition: (key: string, top: number) => void;
  planComplete: boolean;
  setProviderReady: (ready: boolean) => void;
  composerText: string;
  composerAutoFocus: boolean;
  pendingComposers: Record<string, PendingComposer>;
  setComposerText: (body: string) => void;
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
  /** `null` until a plan is installed. File plans are not persisted. */
  planSource: PlanSource | null;

  /** navigate = unit walkthrough; comment = line selection for drafts. */
  uiMode: UiMode;
  /** Flat selectable lines for the current unit (set when entering comment mode). */
  selectableLines: SelectableLine[];
  lineSelection: LineSelection | null;
  composerOpen: boolean;
  draftComments: DraftComment[];

  open: () => void;
  close: () => void;
  startLoading: (sessionKey: string) => number;
  /**
   * Open a walkthrough on an already-built file plan without a loading flash
   * or an annotation stream. Bumps streamGeneration so a late SSE is ignored.
   */
  bootReady: (args: { sessionKey: string; diff: ParsedDiff; plan: ReviewPlan }) => number;
  setPRContext: (prContext: ReviewContext) => void;
  setDiff: (diff: ParsedDiff) => void;
  setFileReady: (diff: ParsedDiff, generation?: number) => void;
  setBuildPhase: (phase: BuildPhase, generation?: number) => void;
  setProviderLabel: (label: string | null) => void;
  beginStreaming: (generation: number) => void;
  /**
   * Start a retry of the annotation stream without clearing the already-fetched
   * diff. Bumps streamGeneration and returns the new generation.
   */
  beginRetry: () => number;
  appendUnit: (unit: ReviewUnit, generation: number) => void;
  setReady: (diff: ParsedDiff, plan: ReviewPlan, generation?: number) => void;
  setError: (error: ReviewErrorInfo | string, generation?: number) => void;
  /**
   * No provider key: retain the diff, navigation, comments and any partial plan.
   * Setup is offered from Review units.
   */
  setNeedsProvider: () => void;
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
  clearDraftComments: () => void;
}

/**
 * Build a stable session key for a PR. Same PR on Conversation vs Files changed
 * (or any other tab URL) must map to the same key so resume works.
 */
export function buildSessionKey(pr: PRIdentity): string {
  return `${pr.owner}/${pr.repo}#${pr.number}`;
}

function newDraftId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `draft-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export const useReviewStore = create<ReviewState>((set, get) => ({
  isOpen: false,
  status: "idle",
  error: null,
  needsProvider: false,
  buildPhase: null,
  providerLabel: null,
  diff: null,
  plan: null,
  prContext: null,
  ...NAVIGATION_RESET,
  planComplete: false,
  composerText: "",
  composerAutoFocus: true,
  streamGeneration: 0,
  sessionKey: null,
  diffViewMode: DEFAULT_DIFF_VIEW_MODE,
  planSource: null,
  uiMode: "navigate",
  selectableLines: [],
  lineSelection: null,
  composerOpen: false,
  draftComments: [],

  open: () => set({ isOpen: true }),
  close: () =>
    set((state) => ({
      isOpen: false,
      streamGeneration: state.streamGeneration + 1,
      ...COMMENT_UI_RESET,
    })),

  startLoading: (sessionKey) => {
    const streamGeneration = get().streamGeneration + 1;
    set({
      status: "loading",
      error: null,
      needsProvider: false,
      buildPhase: "extracting_diff",
      providerLabel: null,
      ...NAVIGATION_RESET,
      planComplete: false,
      plan: null,
      diff: null,
      sessionKey,
      streamGeneration,
      draftComments: [],
      planSource: null,
      ...COMMENT_UI_RESET,
    });
    return streamGeneration;
  },

  bootReady: ({ sessionKey, diff, plan }) => {
    const streamGeneration = get().streamGeneration + 1;
    set({
      status: "ready",
      error: null,
      buildPhase: null,
      ...NAVIGATION_RESET,
      planComplete: false,
      plan,
      diff,
      sessionKey,
      streamGeneration,
      planSource: "files",
      draftComments: [],
      ...COMMENT_UI_RESET,
    });
    return streamGeneration;
  },

  setPRContext: (prContext) => set({ prContext }),

  setProviderReady: (ready) => set({ needsProvider: !ready }),

  setDiff: (diff) =>
    set({
      diff,
      // Diff just landed — move past "extracting" into local/provider prep.
      buildPhase: "processing_diff",
    }),

  // Initial diff arrival is not a scope change. Keep any tab the user opened
  // while fetching, and use the generation established by startLoading.
  setFileReady: (diff, generation) => {
    if (generation !== undefined && get().streamGeneration !== generation) return;
    set({
      status: "ready",
      diff,
      plan: buildFileReviewPlan(diff),
      planSource: "files",
      planComplete: false,
      buildPhase: null,
      error: null,
    });
  },

  setBuildPhase: (phase, generation) => {
    if (generation !== undefined && get().streamGeneration !== generation) return;
    set({ buildPhase: phase });
  },

  setProviderLabel: (label) => set({ providerLabel: label }),

  beginStreaming: (generation) => {
    if (get().streamGeneration !== generation) return;
    set({
      status: "streaming",
      planSource: "ai",
      planComplete: false,
      plan: { units: [] },
      error: null,
    });
  },

  beginRetry: () => {
    const nextGeneration = get().streamGeneration + 1;
    const hasDiff = get().diff !== null;
    set({
      streamGeneration: nextGeneration,
      status: hasDiff ? "streaming" : "loading",
      error: null,
      // A retry always re-runs the annotate call, so the connect-provider
      // prompt must not survive into the new attempt.
      needsProvider: false,
      plan: get().planSource === "ai" ? get().plan : hasDiff ? { units: [] } : null,
      planSource: "ai",
      planComplete: false,
      // Cached-diff retry skips extract; full restart goes through startLoading.
      buildPhase: hasDiff ? "processing_diff" : "extracting_diff",
      providerLabel: hasDiff ? get().providerLabel : null,
    });
    return nextGeneration;
  },

  appendUnit: (unit, generation) => {
    if (get().streamGeneration !== generation) return;
    set((state) => {
      const existing = state.plan?.units ?? [];
      const units = existing.some((u) => u.id === unit.id)
        ? existing.map((u) => (u.id === unit.id ? unit : u))
        : [...existing, unit];
      return {
        status: "streaming",
        plan: { units },
        planSource: "ai",
        error: null,
        // Units imply tokens already arrived (STATUS may have set this earlier).
        buildPhase: "tokens_streaming",
      };
    });
  },

  setReady: (diff, plan, generation) => {
    if (generation !== undefined && get().streamGeneration !== generation) return;
    const state = get();
    const selection =
      state.selection.kind === "unit" &&
      !plan.units.some(
        (unit) => unit.id === (state.selection.kind === "unit" ? state.selection.id : ""),
      )
        ? ({ kind: "summary" } as ContentSelection)
        : state.selection;
    set({
      status: "ready",
      diff,
      plan,
      selection,
      error: null,
      buildPhase: null,
      planSource: "ai",
      planComplete: true,
    });
  },

  setError: (error, generation) => {
    if (generation !== undefined && get().streamGeneration !== generation) return;
    const normalized = typeof error === "string" ? { message: error } : error;
    // A missing provider key isn't a failure the user should read as an error —
    // both the content-script pre-check and the background backstop land here.
    if (normalized.code === NO_API_KEY_ERROR_CODE) {
      get().setNeedsProvider();
      return;
    }
    set({ status: "error", error: normalized, buildPhase: null });
  },

  setNeedsProvider: () => {
    const { diff, planSource } = get();
    set({
      needsProvider: true,
      error: null,
      buildPhase: null,
      ...(diff ? { status: "ready" as const } : {}),
      ...(diff && planSource !== "ai"
        ? { plan: buildFileReviewPlan(diff), planSource: "files" as const }
        : {}),
    });
  },

  selectContent: (selection, mode) => {
    const state = get();
    if (
      selection.kind === "file" &&
      !state.diff?.files.some((file) => file.path === selection.path)
    )
      return;
    if (
      selection.kind === "unit" &&
      (state.planSource !== "ai" || !state.plan?.units.some((unit) => unit.id === selection.id))
    )
      return;
    const navigationMode =
      mode ??
      (selection.kind === "file"
        ? "files"
        : selection.kind === "unit"
          ? "units"
          : state.navigationMode);
    const collapsedDirectories = { ...state.collapsedDirectories };
    if (selection.kind === "file") {
      const parts = selection.path.split("/");
      for (let i = 1; i < parts.length; i++)
        delete collapsedDirectories[parts.slice(0, i).join("/")];
    }
    set({
      selection,
      navigationMode,
      collapsedDirectories,
      ...(navigationMode === "files"
        ? { lastFileSelection: selection }
        : { lastUnitSelection: selection }),
      ...(selectionKey(selection) !== selectionKey(state.selection) ? COMMENT_UI_RESET : {}),
    });
  },

  goToUnit: (index) => {
    const unit = get().plan?.units[index - 1];
    if (index === 0) get().selectContent({ kind: "summary" }, "units");
    else if (unit) get().selectContent({ kind: "unit", id: unit.id });
  },

  setNavigationMode: (mode) => {
    const state = get();
    if (mode === state.navigationMode) return;
    let selection = mode === "files" ? state.lastFileSelection : state.lastUnitSelection;
    if (!selection && mode === "files") {
      const unit =
        state.selection.kind === "unit"
          ? state.plan?.units.find(
              (unit) => unit.id === (state.selection.kind === "unit" ? state.selection.id : ""),
            )
          : null;
      const path =
        unit?.files.find((ref) => state.diff?.files.some((file) => file.path === ref.fileId))
          ?.fileId ?? orderedFiles(state.diff)[0]?.path;
      selection = path ? { kind: "file", path } : { kind: "summary" };
    }
    if (!selection && mode === "units") {
      const unit =
        state.planSource === "ai"
          ? (state.plan?.units.find(
              (unit) =>
                state.selection.kind === "file" &&
                unit.files.some(
                  (ref) =>
                    ref.fileId === (state.selection.kind === "file" ? state.selection.path : ""),
                ),
            ) ?? state.plan?.units[0])
          : null;
      selection = unit ? { kind: "unit", id: unit.id } : { kind: "summary" };
    }
    const selectedId = selection?.kind === "unit" ? selection.id : null;
    if (selectedId && !state.plan?.units.some((unit) => unit.id === selectedId))
      selection = { kind: "summary" };
    state.selectContent(selection ?? { kind: "summary" }, mode);
    // An empty tab has no unit to remember yet. Once streaming provides one,
    // its first selection can follow the file the reviewer was reading.
    if (mode === "units" && !state.lastUnitSelection && selection?.kind === "summary")
      set({ lastUnitSelection: null });
  },

  goToFile: (path) => get().selectContent({ kind: "file", path }),
  toggleDirectory: (path) =>
    set((state) => ({
      collapsedDirectories: {
        ...state.collapsedDirectories,
        [path]: !state.collapsedDirectories[path],
      },
    })),
  saveScrollPosition: (key, top) =>
    set((state) => ({ scrollPositions: { ...state.scrollPositions, [key]: top } })),

  goNext: () => {
    const state = get();
    const sequence: ContentSelection[] =
      state.navigationMode === "files"
        ? orderedFiles(state.diff).map((file) => ({ kind: "file", path: file.path }))
        : (state.planSource === "ai" ? (state.plan?.units ?? []) : []).map((unit) => ({
            kind: "unit",
            id: unit.id,
          }));
    const index = sequence.findIndex(
      (item) => selectionKey(item) === selectionKey(state.selection),
    );
    if (sequence[index + 1]) state.selectContent(sequence[index + 1]);
  },

  goPrev: () => {
    const state = get();
    if (state.selection.kind === "summary") return;
    const sequence: ContentSelection[] =
      state.navigationMode === "files"
        ? orderedFiles(state.diff).map((file) => ({ kind: "file", path: file.path }))
        : (state.planSource === "ai" ? (state.plan?.units ?? []) : []).map((unit) => ({
            kind: "unit",
            id: unit.id,
          }));
    const index = sequence.findIndex(
      (item) => selectionKey(item) === selectionKey(state.selection),
    );
    state.selectContent(sequence[index - 1] ?? { kind: "summary" });
  },

  setDiffViewMode: (mode) => {
    // Invalidate any in-flight hydrate so it cannot clobber a user choice.
    diffViewModeHydrateEpoch += 1;
    diffViewModeHydrated = true;
    set({ diffViewMode: mode });
    void getActiveReviewHost()?.persistDiffViewMode?.(mode);
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

  exitCommentMode: () => set({ ...COMMENT_UI_RESET }),

  setSelectableLines: (lines) => {
    const { uiMode, lineSelection, selectableLines: prevLines } = get();
    if (uiMode !== "comment") {
      const pending = Object.values(get().pendingComposers).find(
        (entry) =>
          entry.lines.length > 0 &&
          entry.lines.every((selected) => lines.some((line) => line.id === selected.id)),
      );
      set(
        pending
          ? {
              uiMode: "comment",
              selectableLines: lines,
              composerOpen: true,
              composerText: pending.body,
              composerAutoFocus: false,
              lineSelection: {
                anchorIndex: lines.findIndex((line) => line.id === pending.lines[0].id),
                focusIndex: lines.findIndex(
                  (line) => line.id === pending.lines[pending.lines.length - 1].id,
                ),
              },
            }
          : { selectableLines: lines },
      );
      return;
    }
    if (lines.length === 0) {
      set({ ...COMMENT_UI_RESET });
      return;
    }

    // Rematch by stable line id so split↔unified (or RIGHT-only) toggles
    // keep the cursor on the same logical line when it still exists.
    let nextSelection: LineSelection = { anchorIndex: 0, focusIndex: 0 };
    let selectionPreserved = false;
    if (lineSelection) {
      const prevFocus = prevLines[lineSelection.focusIndex];
      const prevAnchor = prevLines[lineSelection.anchorIndex];
      const focusIdx = prevFocus ? lines.findIndex((l) => l.id === prevFocus.id) : -1;
      const anchorIdx = prevAnchor ? lines.findIndex((l) => l.id === prevAnchor.id) : -1;
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
      if (candidate.filePath === anchor.filePath && candidate.side === anchor.side) {
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
    const pending =
      get().pendingComposers[composerKey(linesInSelection(selectableLines, lineSelection))];
    set({ composerOpen: true, composerText: pending?.body ?? "", composerAutoFocus: true });
  },

  setComposerText: (body) => {
    const { selectableLines, lineSelection, pendingComposers } = get();
    const lines = lineSelection ? linesInSelection(selectableLines, lineSelection) : [];
    const next = { ...pendingComposers };
    if (body) next[composerKey(lines)] = { lines, body };
    else delete next[composerKey(lines)];
    set({ composerText: body, pendingComposers: next });
  },
  closeComposer: () => {
    get().setComposerText("");
    set({ composerOpen: false });
  },

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
      selectedCode: selected.map((l) => l.content).join("\n"),
      body: trimmed,
      unitId,
    };

    get().setComposerText("");
    set({
      draftComments: [...draftComments, draft],
      composerOpen: false,
    });
  },

  updateDraftComment: (id, body) => {
    const trimmed = body.trim();
    if (!trimmed) return;
    set((state) => ({
      draftComments: state.draftComments.map((d) => (d.id === id ? { ...d, body: trimmed } : d)),
    }));
  },

  removeDraftComment: (id) => {
    set((state) => ({
      draftComments: state.draftComments.filter((d) => d.id !== id),
    }));
  },

  clearDraftComments: () => set({ draftComments: [] }),
}));

/** Bumped when the user sets a mode so pending storage reads are dropped. */
let diffViewModeHydrateEpoch = 0;
let diffViewModeHydrated = false;
let diffViewModeHydrateInFlight: Promise<void> | null = null;

/**
 * Hydrate the diff view mode preference from the active host.
 * Safe to call multiple times; runs at most once unless reset for tests.
 * In-flight reads are discarded if the user changes mode first.
 */
export async function hydrateDiffViewMode(): Promise<void> {
  if (diffViewModeHydrated) return;
  if (diffViewModeHydrateInFlight) return diffViewModeHydrateInFlight;

  const epoch = diffViewModeHydrateEpoch;
  diffViewModeHydrateInFlight = (async () => {
    try {
      const mode = (await getActiveReviewHost()?.readDiffViewMode?.()) ?? DEFAULT_DIFF_VIEW_MODE;
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
  const state = useReviewStore.getState();
  if (!state.diff || !state.sessionKey) return;
  const host = getActiveReviewHost();
  if (!host) return;
  const payload: PersistedSession = {
    diff: state.diff,
    plan: state.planSource === "ai" ? state.plan : null,
    planSource: state.planSource,
    planComplete: state.planComplete,
    prContext: state.prContext,
    selection: state.selection,
    navigationMode: state.navigationMode,
    lastFileSelection: state.lastFileSelection,
    lastUnitSelection: state.lastUnitSelection,
    collapsedDirectories: state.collapsedDirectories,
    scrollPositions: state.scrollPositions,
    draftComments: state.draftComments,
    pendingComposers: state.pendingComposers,
  };
  try {
    await host.persistSession(state.sessionKey, payload);
  } catch (error) {
    console.warn("Guided Review: failed to persist session", error);
  }
}

export async function restoreSession(sessionKey: string): Promise<boolean> {
  const host = getActiveReviewHost();
  if (!host) return false;
  const generation = useReviewStore.getState().streamGeneration;
  let saved: PersistedSession | undefined;
  try {
    saved = (await host.restoreSession(sessionKey)) as PersistedSession | undefined;
  } catch (error) {
    console.warn("Guided Review: failed to restore session", error);
    return false;
  }
  if (!saved?.diff?.files || generation !== useReviewStore.getState().streamGeneration)
    return false;
  const source = saved.planSource ?? (saved.plan ? "ai" : "files");
  const plan = source === "ai" ? (saved.plan ?? { units: [] }) : buildFileReviewPlan(saved.diff);
  const legacyUnit =
    plan.units[Math.min(Math.max((saved.currentUnitIndex ?? 0) - 1, 0), plan.units.length - 1)];
  let selection: ContentSelection =
    saved.selection ??
    (saved.navigationMode === "files" && saved.currentFileIndex
      ? { kind: "file", path: saved.diff.files[saved.currentFileIndex - 1]?.path ?? "" }
      : (saved.currentUnitIndex ?? 0) > 0 && legacyUnit
        ? { kind: "unit", id: legacyUnit.id }
        : { kind: "summary" });
  const valid = (item: ContentSelection | null | undefined): ContentSelection | null => {
    if (!item) return null;
    if (item.kind === "summary") return item;
    if (item.kind === "file" && saved.diff.files.some((file) => file.path === item.path))
      return item;
    if (item.kind === "unit" && source === "ai" && plan.units.some((unit) => unit.id === item.id))
      return item;
    return null;
  };
  selection = valid(selection) ?? { kind: "summary" };
  useReviewStore.setState({
    ...NAVIGATION_RESET,
    status: "ready",
    planSource: source,
    planComplete: saved.planComplete ?? source === "ai",
    diff: saved.diff,
    plan,
    prContext: saved.prContext ?? null,
    selection,
    navigationMode: saved.navigationMode ?? "units",
    lastFileSelection:
      valid(saved.lastFileSelection) ?? (selection.kind === "file" ? selection : null),
    lastUnitSelection:
      valid(saved.lastUnitSelection) ?? (selection.kind === "unit" ? selection : null),
    collapsedDirectories: saved.collapsedDirectories ?? {},
    scrollPositions: saved.scrollPositions ?? {},
    pendingComposers: saved.pendingComposers ?? {},
    sessionKey,
    error: null,
    buildPhase: null,
    draftComments: (saved.draftComments ?? []).map((draft) => ({
      ...draft,
      selectedCode: draft.selectedCode ?? "",
    })),
    ...COMMENT_UI_RESET,
  });
  return true;
}
