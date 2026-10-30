import { beforeEach, describe, expect, it } from "vitest";
import { resolveUnitFiles } from "@guided-review/core";
import { buildSelectableLines } from "@guided-review/ui/review/buildSelectableLines";
import { orderedFiles } from "@guided-review/ui/review/fileNavigation";
import { DEFAULT_DIFF_VIEW_MODE } from "@guided-review/ui/review/diffView";
import {
  useReviewStore,
  persistSession,
  restoreSession,
  buildSessionKey,
} from "@guided-review/ui/review/store";
import type { ParsedDiff, PRContext, ReviewPlan } from "@extension/lib/types";
import { createGitHubReviewHost } from "@extension/content/githubHost";
import { createMemoryReviewHost, setActiveReviewHost } from "@guided-review/ui/review/host";

function diffFixture(): ParsedDiff {
  return { files: [] };
}

function planFixture(unitCount: number): ReviewPlan {
  return {
    units: Array.from({ length: unitCount }, (_, i) => ({
      id: `u${i}`,
      title: `Unit ${i}`,
      kind: "change" as const,
      context: "because",
      files: [],
    })),
  };
}

function prContextFixture(): PRContext {
  return {
    owner: "acme",
    repo: "widgets",
    number: 1,
    url: "https://github.com/acme/widgets/pull/1",
    title: "Add feature",
    description: "",
    descriptionHtml: "",
    author: "octocat",
    baseRef: "main",
    headRef: "feature",
  };
}

const SESSION_KEY = buildSessionKey({ owner: "acme", repo: "widgets", number: 1 });
const STORAGE_KEY = `guidedReview.session.${SESSION_KEY}`;

function resetStore(): void {
  useReviewStore.setState({
    ...useReviewStore.getInitialState(),
    isOpen: false,
    status: "idle",
    error: null,
    needsProvider: false,
    buildPhase: null,
    providerLabel: null,
    diff: null,
    plan: null,
    prContext: null,
    selection: { kind: "summary" },
    streamGeneration: 0,
    sessionKey: null,
    diffViewMode: DEFAULT_DIFF_VIEW_MODE,
    uiMode: "navigate",
    selectableLines: [],
    lineSelection: null,
    composerOpen: false,
    draftComments: [],
  });
}

function selectableFixture(count = 3) {
  return Array.from({ length: count }, (_, i) => ({
    id: `src/foo.ts#0:${i}:RIGHT`,
    filePath: "src/foo.ts",
    hunkId: "src/foo.ts#0",
    lineIndex: i,
    side: "RIGHT" as const,
    newLine: i + 1,
    type: "add" as const,
    content: `line ${i + 1}`,
  }));
}

function populatedDiff(): ParsedDiff {
  const file = (
    path: string,
    status: "modified" | "added" | "removed" | "renamed" = "modified",
    binary = false,
  ) => ({
    path,
    status,
    isBinaryOrElided: binary,
    previousPath: status === "renamed" ? "old.ts" : undefined,
    hunks: binary
      ? []
      : [0, 1].map((i) => ({
          id: `${path}#${i}`,
          header: "@@ -1 +1 @@",
          oldStart: i + 1,
          oldLines: 1,
          newStart: i + 1,
          newLines: 1,
          lines: [{ type: "add" as const, content: `line ${i + 1}`, newLine: i + 1 }],
        })),
  });
  return {
    files: [
      file("README.md"),
      file("src/renamed.ts", "renamed"),
      file("src/deleted.ts", "removed"),
      file("assets/binary.dat", "added", true),
      file("generated/elided.txt", "modified", true),
    ],
  };
}

function scopedPlan(): ReviewPlan {
  return {
    units: [
      {
        ...planFixture(1).units[0],
        files: [{ fileId: "src/renamed.ts", hunkIds: ["src/renamed.ts#1"], role: "core_logic" }],
      },
    ],
  };
}

describe("review workspace state", () => {
  beforeEach(() => {
    resetStore();
    setActiveReviewHost(createGitHubReviewHost());
  });

  it("navigates all diff files independently of ordered, scoped AI units", () => {
    const diff = populatedDiff();
    const plan = scopedPlan();
    useReviewStore.getState().bootReady({ sessionKey: SESSION_KEY, diff });
    expect(useReviewStore.getState().selection).toEqual({ kind: "summary" });
    expect(useReviewStore.getState().navigationMode).toBe("files");
    useReviewStore.getState().setReady(diff, plan);
    const visited = [];
    for (let i = 0; i < diff.files.length; i++) {
      useReviewStore.getState().goNext();
      visited.push(useReviewStore.getState().selection);
    }
    expect(visited).toEqual(orderedFiles(diff).map((file) => ({ kind: "file", path: file.path })));
    useReviewStore.getState().goToFile("src/renamed.ts");
    useReviewStore.getState().saveScrollPosition("file:src/renamed.ts", 240);
    useReviewStore.getState().setNavigationMode("units");
    expect(useReviewStore.getState().selection).toEqual({ kind: "unit", id: "u0" });
    expect(resolveUnitFiles(plan.units[0], diff)[0].hunks.map((hunk) => hunk.id)).toEqual([
      "src/renamed.ts#1",
    ]);
    useReviewStore.getState().goPrev();
    expect(useReviewStore.getState().selection).toEqual({ kind: "summary" });
    useReviewStore.getState().setNavigationMode("files");
    expect(useReviewStore.getState().selection).toEqual({ kind: "file", path: "src/renamed.ts" });
    expect(useReviewStore.getState().scrollPositions["file:src/renamed.ts"]).toBe(240);
    expect(
      useReviewStore.getState().diff?.files.find((file) => file.path === "src/renamed.ts")?.hunks,
    ).toHaveLength(2);
  });

  it("opens the first streamed review unit and preserves navigation as generation continues", () => {
    const state = useReviewStore.getState();
    const diff = populatedDiff();
    state.bootReady({ sessionKey: SESSION_KEY, diff });
    state.setNavigationMode("units");
    const generation = state.beginRetry();
    const plan = planFixture(2);

    state.appendUnit(plan.units[0], generation - 1);
    expect(useReviewStore.getState().selection).toEqual({ kind: "summary" });
    state.appendUnit(plan.units[0], generation);
    expect(useReviewStore.getState()).toMatchObject({
      status: "streaming",
      selection: { kind: "unit", id: "u0" },
      lastUnitSelection: { kind: "unit", id: "u0" },
    });

    state.goToUnit(0);
    state.appendUnit(plan.units[1], generation);
    state.appendUnit(plan.units[0], generation);
    state.setReady(diff, plan, generation);
    expect(useReviewStore.getState().selection).toEqual({ kind: "summary" });
  });

  it("preserves file selection, saved drafts and unfinished text through streaming, failure, retry and completion", () => {
    const diff = populatedDiff();
    const state = useReviewStore.getState();
    state.bootReady({ sessionKey: SESSION_KEY, diff });
    state.goToFile("src/renamed.ts");
    const file = diff.files[1];
    const lines = buildSelectableLines([{ file, hunks: file.hunks }], "unified");
    state.enterCommentMode(lines);
    state.saveDraftComment("Saved once");
    state.openComposer();
    state.setComposerText("Unfinished note");
    const generation = state.beginRetry();
    state.appendUnit(scopedPlan().units[0], generation);
    state.setError("Provider disconnected", generation);
    expect(useReviewStore.getState().plan?.units).toHaveLength(1);
    const retry = state.beginRetry();
    state.setReady(diff, { units: [] }, generation); // stale completion
    expect(useReviewStore.getState().status).toBe("streaming");
    state.setReady(diff, scopedPlan(), retry);
    expect(useReviewStore.getState().selection).toEqual({ kind: "file", path: file.path });
    expect(useReviewStore.getState().composerText).toBe("Unfinished note");
    state.goToFile("README.md");
    state.setSelectableLines([]);
    state.goToFile(file.path);
    state.setSelectableLines(lines);
    expect(useReviewStore.getState().composerOpen).toBe(true);
    expect(useReviewStore.getState().composerText).toBe("Unfinished note");
    state.saveDraftComment("Unfinished note");
    expect(useReviewStore.getState().draftComments.map((draft) => draft.body)).toEqual([
      "Saved once",
      "Unfinished note",
    ]);
    expect(useReviewStore.getState().pendingComposers).toEqual({});
  });

  it("persists file-only navigation, folder expansion, drafts and composer text without a synthetic plan", async () => {
    const diff = populatedDiff();
    const state = useReviewStore.getState();
    state.bootReady({ sessionKey: SESSION_KEY, diff });
    state.goToFile("src/renamed.ts");
    state.toggleDirectory("assets");
    state.enterCommentMode(selectableFixture(2));
    state.saveDraftComment("Keep this");
    state.openComposer();
    state.setComposerText("Still typing");
    await persistSession();
    const stored = (await chrome.storage.session.get(STORAGE_KEY))[STORAGE_KEY] as {
      plan: unknown;
    };
    expect(stored.plan).toBeNull();
    resetStore();
    expect(await restoreSession(SESSION_KEY)).toBe(true);
    expect(useReviewStore.getState()).toMatchObject({
      plan: null,
      planComplete: false,
      navigationMode: "files",
      selection: { kind: "file", path: "src/renamed.ts" },
      collapsedDirectories: { assets: true },
    });
    expect(useReviewStore.getState().plan).toBeNull();
    expect(useReviewStore.getState().draftComments).toHaveLength(1);
    expect(Object.values(useReviewStore.getState().pendingComposers)[0].body).toBe("Still typing");

    // Older file-browsing sessions may still contain a synthetic plan.
    await chrome.storage.session.set({
      [STORAGE_KEY]: { ...stored, diff, plan: scopedPlan(), planSource: "files" },
    });
    expect(await restoreSession(SESSION_KEY)).toBe(true);
    expect(useReviewStore.getState().plan).toBeNull();
    expect(useReviewStore.getState().draftComments).toHaveLength(1);
  });

  it("retries with a fresh plan even when the provider changes IDs, preserving notes and files", async () => {
    const state = useReviewStore.getState();
    const diff = populatedDiff();
    state.bootReady({ sessionKey: SESSION_KEY, diff });
    const generation = state.beginRetry();
    state.appendUnit(scopedPlan().units[0], generation);
    state.goToUnit(1);
    const file = diff.files[1];
    state.enterCommentMode(buildSelectableLines([{ file, hunks: file.hunks }], "unified"));
    state.saveDraftComment("Keep the saved note");
    state.openComposer();
    state.setComposerText("Keep the unfinished note");
    state.saveScrollPosition("unit:u0", 400);
    state.setError("Disconnected", generation);

    const retry = state.beginRetry();
    expect(useReviewStore.getState().plan?.units).toEqual([]);
    expect(useReviewStore.getState().selection).toEqual({ kind: "file", path: "src/renamed.ts" });
    expect(useReviewStore.getState().scrollPositions["unit:u0"]).toBeUndefined();
    state.appendUnit(scopedPlan().units[0], generation); // stale stream
    const replacement = { ...scopedPlan().units[0], id: "different-model-id" };
    state.appendUnit(replacement, retry);
    state.setError("Disconnected again", retry);
    await persistSession();
    resetStore();
    expect(await restoreSession(SESSION_KEY)).toBe(true);
    expect(useReviewStore.getState().plan?.units).toEqual([replacement]);
    expect(useReviewStore.getState().planComplete).toBe(false);
    expect(useReviewStore.getState().draftComments[0].body).toBe("Keep the saved note");
    expect(Object.values(useReviewStore.getState().pendingComposers)[0].body).toBe(
      "Keep the unfinished note",
    );
  });

  it("restores a legacy AI index as a stable selection, and resets incompatible state on scope change", async () => {
    await chrome.storage.session.set({
      [STORAGE_KEY]: {
        diff: populatedDiff(),
        plan: scopedPlan(),
        currentUnitIndex: 99,
        prContext: prContextFixture(),
      },
    });
    expect(await restoreSession(SESSION_KEY)).toBe(true);
    expect(useReviewStore.getState()).toMatchObject({
      selection: { kind: "unit", id: "u0" },
      navigationMode: "units",
      planComplete: true,
    });
    useReviewStore.getState().bootReady({
      sessionKey: "other-scope",
      diff: diffFixture(),
    });
    expect(useReviewStore.getState()).toMatchObject({
      selection: { kind: "summary" },
      navigationMode: "files",
      draftComments: [],
      pendingComposers: {},
      collapsedDirectories: {},
    });
    expect(buildSessionKey({ owner: "acme", repo: "widgets", number: 1 })).toBe(SESSION_KEY);
  });

  it("keeps token usage with the saved review and rejects updates from an earlier generation", async () => {
    const state = useReviewStore.getState();
    const diff = populatedDiff();
    state.bootReady({ sessionKey: SESSION_KEY, diff });
    const generation = state.beginRetry();
    const usage = {
      inputTokens: 1200,
      outputTokens: 300,
      inputEstimated: false,
      outputEstimated: false,
    };
    state.setTokenUsage(usage, generation);
    state.setReady(diff, scopedPlan(), generation);
    await persistSession();
    resetStore();
    expect(await restoreSession(SESSION_KEY)).toBe(true);
    expect(useReviewStore.getState().tokenUsage).toEqual(usage);
    const retry = state.beginRetry();
    state.setTokenUsage(usage, retry - 1);
    expect(useReviewStore.getState().tokenUsage).toBeNull();
    state.setTokenUsage(usage, retry);
    state.bootReady({ sessionKey: "other-scope", diff });
    expect(useReviewStore.getState().tokenUsage).toBeNull();
  });

  it("does not restore an obsolete asynchronous session over a new scope", async () => {
    let resolve!: (value: unknown) => void;
    setActiveReviewHost(
      createMemoryReviewHost({
        restoreSession: () =>
          new Promise((done) => {
            resolve = done;
          }),
      }),
    );
    const restoration = restoreSession(SESSION_KEY);
    useReviewStore.getState().startLoading("new-scope");
    resolve({ diff: populatedDiff(), plan: scopedPlan() });
    expect(await restoration).toBe(false);
    expect(useReviewStore.getState().sessionKey).toBe("new-scope");
  });

  it("refreshes provider readiness without replacing a cached plan or changing selection", () => {
    const state = useReviewStore.getState();
    state.setReady(populatedDiff(), scopedPlan());
    state.goToUnit(1);
    state.setProviderReady(false);
    state.setNeedsProvider();
    expect(useReviewStore.getState().plan).toEqual(scopedPlan());
    expect(useReviewStore.getState().selection).toEqual({ kind: "unit", id: "u0" });
    state.setProviderReady(true);
    expect(useReviewStore.getState().status).toBe("ready");
  });

  describe("comment mode", () => {
    it("enterCommentMode selects the first line; empty list is a no-op", () => {
      resetStore();
      useReviewStore.getState().enterCommentMode([]);
      expect(useReviewStore.getState().uiMode).toBe("navigate");

      useReviewStore.getState().enterCommentMode(selectableFixture(3));
      const state = useReviewStore.getState();
      expect(state.uiMode).toBe("comment");
      expect(state.lineSelection).toEqual({ anchorIndex: 0, focusIndex: 0 });
      expect(state.selectableLines).toHaveLength(3);
    });

    it("moveLineCursor moves focus; without shift resets anchor", () => {
      resetStore();
      useReviewStore.getState().enterCommentMode(selectableFixture(4));
      useReviewStore.getState().moveLineCursor(1, false);
      expect(useReviewStore.getState().lineSelection).toEqual({
        anchorIndex: 1,
        focusIndex: 1,
      });
      useReviewStore.getState().moveLineCursor(1, false);
      expect(useReviewStore.getState().lineSelection).toEqual({
        anchorIndex: 2,
        focusIndex: 2,
      });
    });

    it("moveLineCursor with extend grows a multi-line range on the same side", () => {
      resetStore();
      useReviewStore.getState().enterCommentMode(selectableFixture(4));
      useReviewStore.getState().moveLineCursor(1, true);
      useReviewStore.getState().moveLineCursor(1, true);
      expect(useReviewStore.getState().lineSelection).toEqual({
        anchorIndex: 0,
        focusIndex: 2,
      });
    });

    it("moveLineCursor with extend skips lines on a different side", () => {
      resetStore();
      const lines = [
        {
          id: "f#0:0:LEFT",
          filePath: "f.ts",
          hunkId: "f#0",
          lineIndex: 0,
          side: "LEFT" as const,
          oldLine: 1,
          type: "del" as const,
          content: "old a",
        },
        {
          id: "f#0:1:RIGHT",
          filePath: "f.ts",
          hunkId: "f#0",
          lineIndex: 1,
          side: "RIGHT" as const,
          newLine: 1,
          type: "add" as const,
          content: "new a",
        },
        {
          id: "f#0:2:LEFT",
          filePath: "f.ts",
          hunkId: "f#0",
          lineIndex: 2,
          side: "LEFT" as const,
          oldLine: 2,
          type: "del" as const,
          content: "old b",
        },
      ];
      useReviewStore.getState().enterCommentMode(lines);
      useReviewStore.getState().moveLineCursor(1, true);
      // Skips RIGHT, lands on second LEFT
      expect(useReviewStore.getState().lineSelection).toEqual({
        anchorIndex: 0,
        focusIndex: 2,
      });
    });

    it("openComposer / saveDraftComment / updateDraftComment / removeDraftComment", () => {
      resetStore();
      useReviewStore.getState().enterCommentMode(selectableFixture(3));
      useReviewStore.getState().moveLineCursor(1, true);
      useReviewStore.getState().openComposer();
      expect(useReviewStore.getState().composerOpen).toBe(true);

      useReviewStore.getState().saveDraftComment("   ");
      expect(useReviewStore.getState().draftComments).toHaveLength(0);
      expect(useReviewStore.getState().composerOpen).toBe(true);

      useReviewStore.getState().saveDraftComment("  Needs a test  ", "u0");
      const drafts = useReviewStore.getState().draftComments;
      expect(drafts).toHaveLength(1);
      expect(drafts[0]).toMatchObject({
        body: "Needs a test",
        filePath: "src/foo.ts",
        side: "RIGHT",
        startLine: 1,
        endLine: 2,
        selectedCode: "line 1\nline 2",
        unitId: "u0",
      });
      expect(useReviewStore.getState().composerOpen).toBe(false);

      useReviewStore.getState().updateDraftComment(drafts[0].id, "  Revised  ");
      expect(useReviewStore.getState().draftComments[0].body).toBe("Revised");

      useReviewStore.getState().updateDraftComment(drafts[0].id, "   ");
      expect(useReviewStore.getState().draftComments[0].body).toBe("Revised");

      useReviewStore.getState().removeDraftComment(drafts[0].id);
      expect(useReviewStore.getState().draftComments).toHaveLength(0);

      useReviewStore.getState().saveDraftComment("again");
      expect(useReviewStore.getState().draftComments).toHaveLength(1);
      useReviewStore.getState().clearDraftComments();
      expect(useReviewStore.getState().draftComments).toHaveLength(0);
    });

    it("goNext / goToUnit exit comment mode but keep drafts", () => {
      resetStore();
      useReviewStore.getState().setReady(diffFixture(), planFixture(2));
      useReviewStore.getState().enterCommentMode(selectableFixture(2));
      useReviewStore.getState().saveDraftComment("keep me");

      useReviewStore.getState().goToUnit(1);
      expect(useReviewStore.getState().uiMode).toBe("navigate");
      expect(useReviewStore.getState().lineSelection).toBeNull();
      expect(useReviewStore.getState().draftComments).toHaveLength(1);
    });

    it("exitCommentMode clears selection without dropping drafts", () => {
      resetStore();
      useReviewStore.getState().enterCommentMode(selectableFixture(2));
      useReviewStore.getState().saveDraftComment("draft");
      useReviewStore.getState().exitCommentMode();
      expect(useReviewStore.getState().uiMode).toBe("navigate");
      expect(useReviewStore.getState().draftComments).toHaveLength(1);
    });

    it("setSelectableLines rematches focus/anchor by line id", () => {
      resetStore();
      const bothSides = [
        {
          id: "f#0:0:LEFT",
          filePath: "f.ts",
          hunkId: "f#0",
          lineIndex: 0,
          side: "LEFT" as const,
          oldLine: 1,
          type: "del" as const,
          content: "old",
        },
        {
          id: "f#0:1:RIGHT",
          filePath: "f.ts",
          hunkId: "f#0",
          lineIndex: 1,
          side: "RIGHT" as const,
          newLine: 1,
          type: "add" as const,
          content: "new 1",
        },
        {
          id: "f#0:2:RIGHT",
          filePath: "f.ts",
          hunkId: "f#0",
          lineIndex: 2,
          side: "RIGHT" as const,
          newLine: 2,
          type: "add" as const,
          content: "new 2",
        },
      ];
      useReviewStore.getState().enterCommentMode(bothSides);
      useReviewStore.getState().moveLineCursor(2, false); // focus RIGHT line 2
      expect(useReviewStore.getState().lineSelection).toEqual({
        anchorIndex: 2,
        focusIndex: 2,
      });

      // Simulate split → RIGHT-only (drop LEFT); same id should stay focused.
      const rightOnly = bothSides.filter((l) => l.side === "RIGHT");
      useReviewStore.getState().setSelectableLines(rightOnly);
      expect(useReviewStore.getState().selectableLines).toHaveLength(2);
      expect(useReviewStore.getState().lineSelection).toEqual({
        anchorIndex: 1,
        focusIndex: 1,
      });
      expect(useReviewStore.getState().selectableLines[1].id).toBe("f#0:2:RIGHT");
    });

    it("setSelectableLines resets when prior focus id is gone", () => {
      resetStore();
      useReviewStore.getState().enterCommentMode(selectableFixture(3));
      useReviewStore.getState().moveLineCursor(2, false);
      useReviewStore.getState().setSelectableLines(selectableFixture(2));
      expect(useReviewStore.getState().lineSelection).toEqual({
        anchorIndex: 0,
        focusIndex: 0,
      });
    });

    it("setSelectableLines with empty list exits comment mode", () => {
      resetStore();
      useReviewStore.getState().enterCommentMode(selectableFixture(2));
      useReviewStore.getState().setSelectableLines([]);
      expect(useReviewStore.getState().uiMode).toBe("navigate");
      expect(useReviewStore.getState().lineSelection).toBeNull();
    });
  });
});
