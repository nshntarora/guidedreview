import { describe, expect, it } from "vitest";
import { useReviewStore, persistSession, restoreSession } from "./store";
import type { ParsedDiff, PRContext, ReviewPlan } from "../../lib/types";

function diffFixture(): ParsedDiff {
  return { files: [] };
}

function planFixture(unitCount: number): ReviewPlan {
  return {
    units: Array.from({ length: unitCount }, (_, i) => ({
      id: `u${i}`,
      title: `Unit ${i}`,
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

function resetStore(): void {
  useReviewStore.setState({
    isOpen: false,
    status: "idle",
    error: null,
    diff: null,
    plan: null,
    prContext: null,
    currentUnitIndex: 0,
  });
}

describe("useReviewStore", () => {
  it("open/close toggle isOpen", () => {
    resetStore();
    useReviewStore.getState().open();
    expect(useReviewStore.getState().isOpen).toBe(true);
    useReviewStore.getState().close();
    expect(useReviewStore.getState().isOpen).toBe(false);
  });

  it("startLoading sets status to loading, clears plan/diff/error, and resets unit index", () => {
    resetStore();
    useReviewStore.setState({
      error: "boom",
      plan: planFixture(1),
      diff: diffFixture(),
      currentUnitIndex: 2,
    });
    useReviewStore.getState().startLoading();
    const state = useReviewStore.getState();
    expect(state.status).toBe("loading");
    expect(state.error).toBeNull();
    expect(state.plan).toBeNull();
    expect(state.diff).toBeNull();
    expect(state.currentUnitIndex).toBe(0);
  });

  it("setDiff stores the diff without changing status or plan", () => {
    resetStore();
    useReviewStore.getState().startLoading();
    const diff = diffFixture();
    useReviewStore.getState().setDiff(diff);

    const state = useReviewStore.getState();
    expect(state.status).toBe("loading");
    expect(state.diff).toBe(diff);
    expect(state.plan).toBeNull();
  });

  it("setReady sets status ready, stores diff/plan, and clamps currentUnitIndex", () => {
    resetStore();
    useReviewStore.setState({ currentUnitIndex: 0 });
    const diff = diffFixture();
    const plan = planFixture(2);
    useReviewStore.getState().setReady(diff, plan);

    const state = useReviewStore.getState();
    expect(state.status).toBe("ready");
    expect(state.diff).toBe(diff);
    expect(state.plan).toBe(plan);
    // Display units = description + 2 plan units; stay on description (index 0).
    expect(state.currentUnitIndex).toBe(0);
  });

  it("setReady preserves a valid currentUnitIndex instead of resetting to 0", () => {
    resetStore();
    // While loading the user is on the description unit (index 0); after ready they stay.
    useReviewStore.setState({ currentUnitIndex: 0 });
    useReviewStore.getState().setReady(diffFixture(), planFixture(3));
    expect(useReviewStore.getState().currentUnitIndex).toBe(0);

    // If somehow past the end, clamp into range (display total = 1 + 2 = 3 → max index 2).
    useReviewStore.setState({ currentUnitIndex: 99 });
    useReviewStore.getState().setReady(diffFixture(), planFixture(2));
    expect(useReviewStore.getState().currentUnitIndex).toBe(2);
  });

  it("setError sets status to error with the message", () => {
    resetStore();
    useReviewStore.getState().setError("something broke");
    expect(useReviewStore.getState().status).toBe("error");
    expect(useReviewStore.getState().error).toBe("something broke");
  });

  it("setPRContext stores the context", () => {
    resetStore();
    const prContext = prContextFixture();
    useReviewStore.getState().setPRContext(prContext);
    expect(useReviewStore.getState().prContext).toEqual(prContext);
  });

  describe("navigation (display units: description + plan)", () => {
    it("goToUnit moves to a valid display index including the description unit", () => {
      resetStore();
      useReviewStore.getState().setReady(diffFixture(), planFixture(3));
      // display: [desc, u0, u1, u2] — indices 0..3
      useReviewStore.getState().goToUnit(3);
      expect(useReviewStore.getState().currentUnitIndex).toBe(3);
      useReviewStore.getState().goToUnit(0);
      expect(useReviewStore.getState().currentUnitIndex).toBe(0);
    });

    it("goToUnit ignores out-of-range indices", () => {
      resetStore();
      useReviewStore.getState().setReady(diffFixture(), planFixture(3));
      useReviewStore.getState().goToUnit(5);
      expect(useReviewStore.getState().currentUnitIndex).toBe(0);
      useReviewStore.getState().goToUnit(-1);
      expect(useReviewStore.getState().currentUnitIndex).toBe(0);
    });

    it("goNext advances across description then plan units, and stops at the last", () => {
      resetStore();
      useReviewStore.getState().setReady(diffFixture(), planFixture(2));
      // total display = 3
      expect(useReviewStore.getState().currentUnitIndex).toBe(0);
      useReviewStore.getState().goNext();
      expect(useReviewStore.getState().currentUnitIndex).toBe(1);
      useReviewStore.getState().goNext();
      expect(useReviewStore.getState().currentUnitIndex).toBe(2);
      useReviewStore.getState().goNext();
      expect(useReviewStore.getState().currentUnitIndex).toBe(2);
    });

    it("goPrev retreats but stops at the description unit (index 0)", () => {
      resetStore();
      useReviewStore.getState().setReady(diffFixture(), planFixture(2));
      useReviewStore.getState().goToUnit(1);
      useReviewStore.getState().goPrev();
      expect(useReviewStore.getState().currentUnitIndex).toBe(0);
      useReviewStore.getState().goPrev();
      expect(useReviewStore.getState().currentUnitIndex).toBe(0);
    });

    it("goNext is a no-op while loading (only the description unit exists)", () => {
      resetStore();
      useReviewStore.getState().startLoading();
      useReviewStore.getState().goNext();
      useReviewStore.getState().goPrev();
      expect(useReviewStore.getState().currentUnitIndex).toBe(0);
    });
  });

  describe("persistSession / restoreSession", () => {
    const prUrl = "https://github.com/acme/widgets/pull/1";

    it("persistSession is a no-op when the review isn't ready", async () => {
      resetStore();
      await persistSession(prUrl);
      const stored = await chrome.storage.session.get(`guidedReview.session.${prUrl}`);
      expect(stored[`guidedReview.session.${prUrl}`]).toBeUndefined();
    });

    it("persistSession stores the ready session, and restoreSession restores it", async () => {
      resetStore();
      const diff = diffFixture();
      const plan = planFixture(2);
      const prContext = prContextFixture();
      useReviewStore.getState().setPRContext(prContext);
      useReviewStore.getState().setReady(diff, plan);
      useReviewStore.getState().goToUnit(1);

      await persistSession(prUrl);

      resetStore();
      const restored = await restoreSession(prUrl);

      expect(restored).toBe(true);
      const state = useReviewStore.getState();
      expect(state.status).toBe("ready");
      expect(state.diff).toEqual(diff);
      expect(state.plan).toEqual(plan);
      expect(state.prContext).toEqual(prContext);
      expect(state.currentUnitIndex).toBe(1);
    });

    it("restoreSession clamps an out-of-range saved index", async () => {
      resetStore();
      const plan = planFixture(1); // display total = 2
      useReviewStore.getState().setReady(diffFixture(), plan);
      useReviewStore.setState({ currentUnitIndex: 99 });
      await persistSession(prUrl);

      // Force-write an out-of-range index to storage.
      await chrome.storage.session.set({
        [`guidedReview.session.${prUrl}`]: {
          diff: diffFixture(),
          plan,
          prContext: null,
          currentUnitIndex: 99,
        },
      });

      resetStore();
      await restoreSession(prUrl);
      expect(useReviewStore.getState().currentUnitIndex).toBe(1);
    });

    it("restoreSession returns false when nothing was persisted", async () => {
      resetStore();
      const restored = await restoreSession("https://github.com/acme/widgets/pull/999");
      expect(restored).toBe(false);
      expect(useReviewStore.getState().status).toBe("idle");
    });
  });
});
