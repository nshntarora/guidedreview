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

  it("startLoading sets status to loading and clears any prior error", () => {
    resetStore();
    useReviewStore.setState({ error: "boom" });
    useReviewStore.getState().startLoading();
    expect(useReviewStore.getState().status).toBe("loading");
    expect(useReviewStore.getState().error).toBeNull();
  });

  it("setReady sets status ready, stores diff/plan, and resets currentUnitIndex", () => {
    resetStore();
    useReviewStore.setState({ currentUnitIndex: 3 });
    const diff = diffFixture();
    const plan = planFixture(2);
    useReviewStore.getState().setReady(diff, plan);

    const state = useReviewStore.getState();
    expect(state.status).toBe("ready");
    expect(state.diff).toBe(diff);
    expect(state.plan).toBe(plan);
    expect(state.currentUnitIndex).toBe(0);
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

  describe("navigation", () => {
    it("goToUnit moves to a valid index", () => {
      resetStore();
      useReviewStore.getState().setReady(diffFixture(), planFixture(3));
      useReviewStore.getState().goToUnit(2);
      expect(useReviewStore.getState().currentUnitIndex).toBe(2);
    });

    it("goToUnit ignores out-of-range indices", () => {
      resetStore();
      useReviewStore.getState().setReady(diffFixture(), planFixture(3));
      useReviewStore.getState().goToUnit(5);
      expect(useReviewStore.getState().currentUnitIndex).toBe(0);
      useReviewStore.getState().goToUnit(-1);
      expect(useReviewStore.getState().currentUnitIndex).toBe(0);
    });

    it("goNext advances but stops at the last unit", () => {
      resetStore();
      useReviewStore.getState().setReady(diffFixture(), planFixture(2));
      useReviewStore.getState().goNext();
      expect(useReviewStore.getState().currentUnitIndex).toBe(1);
      useReviewStore.getState().goNext();
      expect(useReviewStore.getState().currentUnitIndex).toBe(1);
    });

    it("goPrev retreats but stops at the first unit", () => {
      resetStore();
      useReviewStore.getState().setReady(diffFixture(), planFixture(2));
      useReviewStore.getState().goToUnit(1);
      useReviewStore.getState().goPrev();
      expect(useReviewStore.getState().currentUnitIndex).toBe(0);
      useReviewStore.getState().goPrev();
      expect(useReviewStore.getState().currentUnitIndex).toBe(0);
    });

    it("goNext/goPrev are no-ops when there is no plan", () => {
      resetStore();
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

    it("restoreSession returns false when nothing was persisted", async () => {
      resetStore();
      const restored = await restoreSession("https://github.com/acme/widgets/pull/999");
      expect(restored).toBe(false);
      expect(useReviewStore.getState().status).toBe("idle");
    });
  });
});
