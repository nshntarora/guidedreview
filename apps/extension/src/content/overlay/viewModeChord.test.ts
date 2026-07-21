import { describe, expect, it } from "vitest";
import { recordViewChordKey, VIEW_CHORD_WINDOW_MS, type ViewChordPending } from "./viewModeChord";

describe("recordViewChordKey", () => {
  it("arms on v and completes unified on u", () => {
    const armed = recordViewChordKey(null, "v", 1000);
    expect(armed).toEqual({
      next: { armedAt: 1000 },
      mode: null,
      consumed: true,
    });

    const done = recordViewChordKey(armed.next, "u", 1100);
    expect(done).toEqual({
      next: null,
      mode: "unified",
      consumed: true,
    });
  });

  it("completes split on s after v", () => {
    let pending: ViewChordPending = null;
    pending = recordViewChordKey(pending, "v", 1000).next;
    const done = recordViewChordKey(pending, "s", 1500);
    expect(done).toEqual({ next: null, mode: "split", consumed: true });
  });

  it("is case-insensitive", () => {
    const armed = recordViewChordKey(null, "V", 1000);
    expect(armed.consumed).toBe(true);
    expect(recordViewChordKey(armed.next, "U", 1100).mode).toBe("unified");
    expect(recordViewChordKey(armed.next, "S", 1100).mode).toBe("split");
  });

  it("re-arms when v is pressed again", () => {
    const pending = recordViewChordKey(null, "v", 1000).next;
    const rearm = recordViewChordKey(pending, "v", 1500);
    expect(rearm).toEqual({
      next: { armedAt: 1500 },
      mode: null,
      consumed: true,
    });
    expect(recordViewChordKey(rearm.next, "u", 1600).mode).toBe("unified");
  });

  it("does not complete after the window expires", () => {
    const armed = recordViewChordKey(null, "v", 1000);
    const late = recordViewChordKey(armed.next, "u", 1000 + VIEW_CHORD_WINDOW_MS + 1);
    expect(late).toEqual({ next: null, mode: null, consumed: false });
  });

  it("clears pending and does not consume unrelated keys", () => {
    const armed = recordViewChordKey(null, "v", 1000);
    const other = recordViewChordKey(armed.next, "c", 1100);
    expect(other).toEqual({ next: null, mode: null, consumed: false });

    // Subsequent u without a fresh arm does nothing.
    expect(recordViewChordKey(other.next, "u", 1200)).toEqual({
      next: null,
      mode: null,
      consumed: false,
    });
  });

  it("does not treat multi-character keys as v/u/s", () => {
    expect(recordViewChordKey(null, "ArrowDown", 1000).consumed).toBe(false);
    const armed = recordViewChordKey(null, "v", 1000);
    expect(recordViewChordKey(armed.next, "Escape", 1100).consumed).toBe(false);
  });
});
