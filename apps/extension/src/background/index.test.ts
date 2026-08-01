import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  AnnotateReviewStreamEvent,
  DiffFile,
  GitHubAuthState,
  ParsedDiff,
  ReviewUnit,
} from "../lib/types";
import { setGitHubAuth } from "../lib/github/authStorage";
import { setProviderSettings } from "../lib/settings";
import { MOCK_EXTENSION_ID } from "../test/chromeMock";
import type { MockPort } from "../test/chromeMock";
import type { AnnotateReviewInput, AnnotateStreamEvent } from "./providers/types";

/**
 * Scripted stand-in for the real provider clients: each entry maps a chunk's
 * first file path to the raw text deltas the model "streams" for that chunk.
 * Lets the tests drive chunking, validation and abort behavior without HTTP.
 */
const provider = vi.hoisted(() => ({
  deltasByFirstFilePath: new Map<string, string[]>(),
  /** Awaited between deltas so a test can disconnect the port mid-stream. */
  gate: null as Promise<void> | null,
}));

vi.mock("./providers", () => ({
  getProviderClient: () => ({
    testConnection: async () => {},
    async *annotateReviewStream(
      { diff }: AnnotateReviewInput,
      options?: { signal?: AbortSignal },
    ): AsyncGenerator<AnnotateStreamEvent, void, unknown> {
      const deltas = provider.deltasByFirstFilePath.get(diff.files[0]?.path ?? "") ?? [];
      for (const text of deltas) {
        if (provider.gate) await provider.gate;
        if (options?.signal?.aborted) return;
        yield { type: "text_delta", text };
      }
      yield { type: "done" };
    },
  }),
}));

// background/index.ts registers chrome.runtime listeners as an import-time
// side effect, so it must be imported lazily (after the global chromeMock
// beforeEach in src/test/setup.ts has installed `chrome`) rather than at
// module top-level, which would run before that hook fires.
// setup.ts installs a fresh chrome mock per test, so the worker has to be
// re-imported each time — otherwise only the first test's mock ever receives
// the runtime listeners registered at import time.
beforeEach(() => {
  vi.resetModules();
});

async function loadHandleGitHubAuthGet() {
  const { handleGitHubAuthGet } = await import("./index");
  return handleGitHubAuthGet;
}

async function loadHandleInstalled() {
  const { handleInstalled, WELCOME_PAGE_PATH } = await import("./index");
  return { handleInstalled, WELCOME_PAGE_PATH };
}

type MessageListener = (
  message: unknown,
  sender: unknown,
  sendResponse: (response?: unknown) => void,
) => boolean | void;

/**
 * Deliver a message to the worker's registered onMessage listeners. Defaults to
 * a sender from this extension (an extension page: no `tab`); pass `sender` to
 * simulate a content script or a foreign extension.
 */
async function sendToBackground(message: unknown, sender: unknown = { id: MOCK_EXTENSION_ID }) {
  await import("./index");
  const listeners = [
    ...(chrome.runtime.onMessage as unknown as { __listeners: Set<MessageListener> }).__listeners,
  ];
  return new Promise<unknown>((resolve) => {
    let handled = false;
    for (const listener of listeners) {
      if (listener(message, sender, resolve)) handled = true;
    }
    // A listener that returns falsy will never call sendResponse.
    if (!handled) resolve(undefined);
  });
}

/** A content-script sender whose tab is showing the given PR. */
function tabSender(url: string) {
  return { id: MOCK_EXTENSION_ID, origin: "https://github.com", tab: { id: 7, url } };
}

describe("OPEN_OPTIONS", () => {
  it("opens the options page and acknowledges", async () => {
    const response = await sendToBackground({ type: "OPEN_OPTIONS" });

    expect(chrome.runtime.openOptionsPage).toHaveBeenCalledTimes(1);
    expect(response).toEqual({ ok: true });
  });
});

describe("sender checks", () => {
  const pr = { owner: "acme", repo: "widgets", number: 1 };
  const submit = { type: "SUBMIT_REVIEW", pr, body: "lgtm", event: "COMMENT", comments: [] };

  it("ignores messages from another extension", async () => {
    await expect(
      sendToBackground({ type: "OPEN_OPTIONS" }, { id: "some-other-extension-id" }),
    ).resolves.toBeUndefined();
    expect(chrome.runtime.openOptionsPage).not.toHaveBeenCalled();
  });

  it("rejects SUBMIT_REVIEW naming a PR the sender tab is not on", async () => {
    const response = await sendToBackground(
      submit,
      tabSender("https://github.com/acme/widgets/pull/999/files"),
    );

    expect(response).toEqual({
      ok: false,
      code: "validation",
      error: expect.stringContaining("did not come from the pull request page"),
    });
  });

  it("rejects FETCH_DIFF from a tab that is not on a PR at all", async () => {
    const response = await sendToBackground(
      { type: "FETCH_DIFF", pr },
      tabSender("https://github.com/acme/widgets/issues/4"),
    );

    expect(response).toEqual({ ok: false, error: expect.stringContaining("did not come from") });
  });

  it("allows SUBMIT_REVIEW from the matching PR tab", async () => {
    // Signed out, so it stops at the auth check — past the sender gate, which
    // is what this asserts.
    const response = await sendToBackground(
      submit,
      tabSender("https://github.com/acme/widgets/pull/1/files"),
    );

    expect(response).toMatchObject({ ok: false, code: "not_authenticated" });
  });
});

describe("handleInstalled", () => {
  it("opens the welcome page on first install", async () => {
    const { handleInstalled, WELCOME_PAGE_PATH } = await loadHandleInstalled();

    handleInstalled({ reason: "install" });

    expect(chrome.tabs.create).toHaveBeenCalledTimes(1);
    expect(chrome.tabs.create).toHaveBeenCalledWith({
      url: WELCOME_PAGE_PATH,
    });
    expect(chrome.runtime.getURL).toHaveBeenCalledWith(WELCOME_PAGE_PATH);
  });

  it("does not open a tab on update", async () => {
    const { handleInstalled } = await loadHandleInstalled();

    handleInstalled({ reason: "update" });

    expect(chrome.tabs.create).not.toHaveBeenCalled();
  });
});

describe("handleGitHubAuthGet", () => {
  it("never returns the access token or token type to the caller", async () => {
    const auth: GitHubAuthState = {
      accessToken: "gho_supersecret",
      tokenType: "bearer",
      scope: "repo read:user",
      login: "octocat",
      avatarUrl: "https://example.com/a.png",
      name: "The Octocat",
    };
    await setGitHubAuth(auth);

    const handleGitHubAuthGet = await loadHandleGitHubAuthGet();
    const response = await handleGitHubAuthGet();

    expect(response).toEqual({
      ok: true,
      auth: {
        scope: "repo read:user",
        login: "octocat",
        avatarUrl: "https://example.com/a.png",
        name: "The Octocat",
      },
    });
    expect(response.auth).not.toHaveProperty("accessToken");
    expect(response.auth).not.toHaveProperty("tokenType");
    expect(JSON.stringify(response)).not.toContain("gho_supersecret");
  });

  it("returns auth: null when signed out, without throwing", async () => {
    const handleGitHubAuthGet = await loadHandleGitHubAuthGet();
    await expect(handleGitHubAuthGet()).resolves.toEqual({ ok: true, auth: null });
  });
});

describe("ANNOTATE_REVIEW stream", () => {
  /**
   * A file whose rendered size alone exceeds the 60k-char chunk budget, so
   * every file built this way lands in its own `chunkDiffByFile` chunk.
   */
  function oversizedFile(path: string): DiffFile {
    return {
      path,
      status: "modified",
      isBinaryOrElided: false,
      hunks: [
        {
          id: `${path}#0`,
          header: "@@ -1 +1 @@",
          oldStart: 1,
          oldLines: 1,
          newStart: 1,
          newLines: 1,
          lines: [{ type: "add", content: "x".repeat(60_000), newLine: 1 }],
        },
      ],
    };
  }

  function twoHunkFile(path: string): DiffFile {
    return {
      path,
      status: "modified",
      isBinaryOrElided: false,
      hunks: [0, 1].map((i) => ({
        id: `${path}#${i}`,
        header: "@@ -1 +1 @@",
        oldStart: 1,
        oldLines: 1,
        newStart: 1,
        newLines: 1,
        lines: [{ type: "add" as const, content: `line ${i}`, newLine: 1 }],
      })),
    };
  }

  function unitJsonForHunks(id: string, fileId: string, hunkIds: string[]): string {
    return JSON.stringify({
      id,
      title: `Unit ${id}`,
      context: "Why",
      files: [{ fileId, hunkIds, role: "core_logic" }],
    });
  }

  function unitJson(id: string, fileId: string): string {
    return JSON.stringify({
      id,
      title: `Unit ${id}`,
      context: "Why",
      files: [{ fileId, hunkIds: [], role: "core_logic" }],
    });
  }

  function planJson(units: string[]): string {
    return `{"units":[${units.join(",")}]}`;
  }

  /**
   * Run the worker's port handler end to end and collect what it posted back.
   * Resolves once DONE or ERROR arrives, or once `stop()` is called.
   */
  async function runStream(diff: ParsedDiff): Promise<{
    events: AnnotateReviewStreamEvent[];
    port: MockPort;
  }> {
    // background/index.ts registers its onConnect listener at import time, so
    // it has to be re-imported against the chrome mock this test just got.
    vi.resetModules();
    await import("./index");

    const port = chrome.runtime.connect({ name: "annotate-review" }) as unknown as MockPort;
    const events: AnnotateReviewStreamEvent[] = [];

    const settled = new Promise<void>((resolve) => {
      port.postMessage.mockImplementation((event: AnnotateReviewStreamEvent) => {
        events.push(event);
        if (event.type === "DONE" || event.type === "ERROR") resolve();
      });
      // Safety valve so an aborted stream (which posts nothing) can't hang the test.
      setTimeout(resolve, 200);
    });

    port.__emitMessage({
      type: "ANNOTATE_REVIEW",
      diff,
      prContext: { title: "A PR", description: "", owner: "o", repo: "r", number: 1 },
    });
    await settled;

    return { events, port };
  }

  const unitIds = (events: AnnotateReviewStreamEvent[]): string[] =>
    events.flatMap((e) => (e.type === "UNIT" ? [e.unit.id] : []));

  const donePlan = (events: AnnotateReviewStreamEvent[]): ReviewUnit[] | undefined =>
    events.find((e) => e.type === "DONE")?.plan.units;

  beforeEach(async () => {
    provider.deltasByFirstFilePath.clear();
    provider.gate = null;
    await setProviderSettings({ provider: "anthropic", model: "claude-sonnet-4-5", apiKey: "k" });
  });

  it("namespaces unit ids per chunk so ids from different chunks cannot collide", async () => {
    // Both chunks return a unit with the same model-chosen id.
    provider.deltasByFirstFilePath.set("a.ts", [planJson([unitJson("shared", "a.ts")])]);
    provider.deltasByFirstFilePath.set("b.ts", [planJson([unitJson("shared", "b.ts")])]);

    const { events } = await runStream({ files: [oversizedFile("a.ts"), oversizedFile("b.ts")] });

    expect(unitIds(events)).toEqual(["c0-shared", "c1-shared"]);
    expect(donePlan(events)?.map((u) => u.id)).toEqual(["c0-shared", "c1-shared"]);
  });

  it("posts waiting_for_tokens then tokens_streaming STATUS before units", async () => {
    provider.deltasByFirstFilePath.set("a.ts", [planJson([unitJson("u1", "a.ts")])]);

    const { events } = await runStream({ files: [oversizedFile("a.ts")] });

    const statusPhases = events
      .filter(
        (e): e is Extract<AnnotateReviewStreamEvent, { type: "STATUS" }> => e.type === "STATUS",
      )
      .map((e) => e.phase);
    expect(statusPhases).toEqual(["waiting_for_tokens", "tokens_streaming"]);
    // STATUS events precede the first unit.
    const firstUnitIdx = events.findIndex((e) => e.type === "UNIT");
    const lastStatusIdx = events.map((e) => e.type).lastIndexOf("STATUS");
    expect(lastStatusIdx).toBeLessThan(firstUnitIdx);
  });

  it("drops units referencing a file the model was not given", async () => {
    provider.deltasByFirstFilePath.set("a.ts", [
      planJson([unitJson("real", "a.ts"), unitJson("ghost", "not-in-the-diff.ts")]),
    ]);

    const { events } = await runStream({ files: [oversizedFile("a.ts")] });

    expect(unitIds(events)).toEqual(["c0-real"]);
    expect(donePlan(events)?.map((u) => u.id)).toEqual(["c0-real"]);
  });

  // Guards the StreamPlanParser offset bug: a unit the parser skips must not
  // shift its full-document fallback, or later units arrive twice in the plan.
  // u1 and u3 claim different files so `stripDuplicateHunks` cannot mask it.
  it("emits every unit exactly once when the model skips a required field", async () => {
    const malformed = JSON.stringify({ id: "u2", title: "No context or files" });
    provider.deltasByFirstFilePath.set("a.ts", [
      planJson([
        unitJsonForHunks("u1", "a.ts", ["a.ts#0"]),
        malformed,
        unitJsonForHunks("u3", "a.ts", ["a.ts#1"]),
      ]),
    ]);

    const { events } = await runStream({ files: [twoHunkFile("a.ts")] });

    expect(unitIds(events)).toEqual(["c0-u1", "c0-u3"]);
    expect(donePlan(events)?.map((u) => u.id)).toEqual(["c0-u1", "c0-u3"]);
  });

  // Two units claiming the same hunks are genuinely duplicate content, so the
  // second is dropped rather than shown twice.
  it("drops a later unit that claims hunks an earlier unit already took", async () => {
    provider.deltasByFirstFilePath.set("a.ts", [
      planJson([unitJson("u1", "a.ts"), unitJson("u3", "a.ts")]),
    ]);

    const { events } = await runStream({ files: [oversizedFile("a.ts")] });

    expect(unitIds(events)).toEqual(["c0-u1"]);
  });

  it("stops posting units and never sends DONE once the port disconnects", async () => {
    let openGate = (): void => {};
    provider.gate = new Promise<void>((resolve) => {
      openGate = resolve;
    });
    provider.deltasByFirstFilePath.set("a.ts", [
      planJson([unitJson("u1", "a.ts")]),
      planJson([unitJson("u2", "a.ts")]),
    ]);

    vi.resetModules();
    await import("./index");
    const port = chrome.runtime.connect({ name: "annotate-review" }) as unknown as MockPort;
    const events: AnnotateReviewStreamEvent[] = [];
    port.postMessage.mockImplementation((event: AnnotateReviewStreamEvent) => {
      events.push(event);
    });

    port.__emitMessage({
      type: "ANNOTATE_REVIEW",
      diff: { files: [oversizedFile("a.ts")] },
      prContext: { title: "A PR", description: "", owner: "o", repo: "r", number: 1 },
    });

    // Disconnect before any delta is released, then let the provider run on.
    port.__emitDisconnect();
    openGate();
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(events).toEqual([]);
  });
});
