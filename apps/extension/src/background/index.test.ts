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

/** Deliver a message to the worker's registered onMessage listeners. */
async function sendToBackground(message: unknown): Promise<unknown> {
  await import("./index");
  const listeners = [
    ...(chrome.runtime.onMessage as unknown as { __listeners: Set<MessageListener> }).__listeners,
  ];
  return new Promise((resolve) => {
    for (const listener of listeners) {
      listener(message, {}, resolve);
    }
  });
}

describe("OPEN_OPTIONS", () => {
  it("opens the options page and acknowledges", async () => {
    const response = await sendToBackground({ type: "OPEN_OPTIONS" });

    expect(chrome.runtime.openOptionsPage).toHaveBeenCalledTimes(1);
    expect(response).toEqual({ ok: true });
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
  it("emits every unit exactly once when the model skips a required field", async () => {
    const malformed = JSON.stringify({ id: "u2", title: "No context or files" });
    provider.deltasByFirstFilePath.set("a.ts", [
      planJson([unitJson("u1", "a.ts"), malformed, unitJson("u3", "a.ts")]),
    ]);

    const { events } = await runStream({ files: [oversizedFile("a.ts")] });

    expect(unitIds(events)).toEqual(["c0-u1", "c0-u3"]);
    expect(donePlan(events)?.map((u) => u.id)).toEqual(["c0-u1", "c0-u3"]);
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
