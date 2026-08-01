import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GitHubAuthState } from "../lib/types";
import { setGitHubAuth } from "../lib/github/authStorage";
import { MOCK_EXTENSION_ID } from "../test/chromeMock";

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
