import { describe, expect, it } from "vitest";
import { clearGitHubAuth, getGitHubAuth, setGitHubAuth } from "./authStorage";
import type { GitHubAuthState } from "@extension/lib/types";

const sample: GitHubAuthState = {
  accessToken: "gho_test",
  tokenType: "bearer",
  scope: "repo,read:user",
  login: "octocat",
  avatarUrl: "https://avatars.example/o",
  name: "Octocat",
};

describe("authStorage", () => {
  it("returns null when nothing is stored", async () => {
    await expect(getGitHubAuth()).resolves.toBeNull();
  });

  it("round-trips a full auth state", async () => {
    await setGitHubAuth(sample);
    await expect(getGitHubAuth()).resolves.toEqual(sample);
  });

  it("clears stored auth", async () => {
    await setGitHubAuth(sample);
    await clearGitHubAuth();
    await expect(getGitHubAuth()).resolves.toBeNull();
  });

  it("ignores invalid stored shapes", async () => {
    await chrome.storage.local.set({
      "guidedReview.githubAuth": { accessToken: "x" },
    });
    await expect(getGitHubAuth()).resolves.toBeNull();
  });
});
