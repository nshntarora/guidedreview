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
