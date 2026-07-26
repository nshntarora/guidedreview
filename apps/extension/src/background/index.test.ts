import { describe, expect, it } from "vitest";
import type { GitHubAuthState } from "../lib/types";
import { setGitHubAuth } from "../lib/github/authStorage";

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
