import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ChromeMock, MockPort } from "@extension/test/chromeMock";
import type { FetchDiffResponse, ParsedDiff } from "@extension/lib/types";
import { setProviderSettings } from "@extension/lib/settings";
import { useReviewStore } from "./overlay/store";

// The overlay itself is covered by Overlay.test.tsx; these tests are about the
// start/restore/no-provider orchestration, so keep rendering out of the way.
vi.mock("./overlay/styles/overlay.css?inline", () => ({ default: "" }));
vi.mock("./overlay/Overlay", () => ({ Overlay: () => null }));

const PR_URL = "https://github.com/acme/web/pull/42";
const SESSION_KEY = "guidedReview.session.acme/web#42";

function diffFixture(): ParsedDiff {
  return {
    files: [
      {
        path: "src/foo.ts",
        status: "modified",
        isBinaryOrElided: false,
        hunks: [
          {
            id: "src/foo.ts#0",
            header: "@@ -1,1 +1,1 @@",
            oldStart: 1,
            oldLines: 1,
            newStart: 1,
            newLines: 1,
            lines: [{ type: "add", content: "const a = 1;", newLine: 1 }],
          },
        ],
      },
    ],
  };
}

function chromeMock(): ChromeMock {
  return globalThis.chrome as unknown as ChromeMock;
}

/** Answer FETCH_DIFF with `response`; every other message resolves undefined. */
function stubDiffResponse(response: FetchDiffResponse | { ok: false; error: string }): void {
  chromeMock().runtime.sendMessage.mockImplementation(async (message: unknown) => {
    if ((message as { type?: string })?.type === "FETCH_DIFF") return response;
    return undefined;
  });
}

/**
 * The content script registers its onMessage listener as an import-time side
 * effect, but `src/test/setup.ts` installs a fresh chrome mock before every
 * test — so capture the listeners from the one import and reuse them. Their
 * bodies read `chrome.*` at call time, which resolves to the current mock.
 */
let messageListeners: MessageListener[] | null = null;

type MessageListener = (
  message: unknown,
  sender: unknown,
  sendResponse: (response?: unknown) => void,
) => boolean | void;

async function loadContentScript(): Promise<MessageListener[]> {
  if (!messageListeners) {
    await import("./index");
    messageListeners = [...chromeMock().runtime.onMessage.__listeners] as MessageListener[];
  }
  return messageListeners;
}

/** Fire START_GUIDED_REVIEW at the content script and wait for the flow to settle. */
async function startReview(): Promise<void> {
  const listeners = await loadContentScript();
  for (const listener of listeners) {
    listener({ type: "START_GUIDED_REVIEW" }, {}, () => {});
  }
  // Let the awaited storage reads / diff fetch inside onStartReview settle.
  await vi.waitFor(() => {
    expect(useReviewStore.getState().status).not.toBe("loading");
  });
}

describe("content script review orchestration", () => {
  beforeEach(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: new URL(PR_URL),
    });
    // The description scrape falls back to fetching the Conversation tab.
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("", { status: 404 })),
    );
    useReviewStore.setState({
      status: "idle",
      error: null,
      needsProvider: false,
      diff: null,
      plan: null,
      prContext: null,
      currentUnitIndex: 0,
      sessionKey: null,
      draftComments: [],
      viewedUnitIds: [],
    });
    stubDiffResponse({ ok: true, diff: diffFixture() });
  });

  afterEach(async () => {
    document.body.replaceChildren();
    await Promise.resolve();
  });

  afterAll(async () => {
    // The content script observes document.body for the lifetime of the module.
    // Swap in a fresh, unobserved body so teardown mutations don't re-enter
    // tryInjectButton after jsdom has torn `window` down.
    document.documentElement.replaceChild(document.createElement("body"), document.body);
    await Promise.resolve();
  });

  it("streams an AI plan when a provider is configured and there is no saved session", async () => {
    await setProviderSettings({ provider: "anthropic", model: "claude-opus-4-8", apiKey: "sk-1" });

    await startReview();

    const state = useReviewStore.getState();
    expect(state.status).toBe("streaming");
    expect(state.diff?.files[0].path).toBe("src/foo.ts");
    expect(state.sessionKey).toBe("acme/web#42");
    expect(state.needsProvider).toBe(false);

    // The annotate port is opened and handed the diff to work on.
    expect(chromeMock().runtime.connect).toHaveBeenCalledWith({ name: "annotate-review" });
    const port = chromeMock().runtime.connect.mock.results.at(-1)?.value as MockPort;
    expect(port.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "ANNOTATE_REVIEW" }),
    );
  });

  it("falls back to a file-per-unit plan when no provider key is configured", async () => {
    await setProviderSettings({ provider: "anthropic", model: "claude-opus-4-8", apiKey: "" });

    await startReview();

    const state = useReviewStore.getState();
    expect(state.needsProvider).toBe(true);
    expect(state.status).toBe("ready");
    expect(state.plan?.units.map((u) => u.title)).toEqual(["src/foo.ts"]);
    // No provider means no annotate call at all.
    expect(chromeMock().runtime.connect).not.toHaveBeenCalled();
  });

  it("restores a saved session instead of refetching the diff", async () => {
    await setProviderSettings({ provider: "anthropic", model: "claude-opus-4-8", apiKey: "sk-1" });
    await chrome.storage.session.set({
      [SESSION_KEY]: {
        diff: diffFixture(),
        plan: {
          units: [{ id: "u1", title: "Saved unit", kind: "change", context: "why", files: [] }],
        },
        prContext: null,
        currentUnitIndex: 1,
        draftComments: [],
      },
    });

    await startReview();

    const state = useReviewStore.getState();
    expect(state.status).toBe("ready");
    expect(state.plan?.units[0].title).toBe("Saved unit");
    expect(state.currentUnitIndex).toBe(1);
    expect(chromeMock().runtime.sendMessage).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: "FETCH_DIFF" }),
    );
  });

  it("surfaces a diff fetch failure as an error state", async () => {
    await setProviderSettings({ provider: "anthropic", model: "claude-opus-4-8", apiKey: "sk-1" });
    stubDiffResponse({ ok: false, error: "Could not fetch the diff for this PR (HTTP 404)." });

    await startReview();

    const state = useReviewStore.getState();
    expect(state.status).toBe("error");
    expect(state.error?.message).toContain("HTTP 404");
    expect(chromeMock().runtime.connect).not.toHaveBeenCalled();
  });
});
