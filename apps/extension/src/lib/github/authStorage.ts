import type { GitHubAuthState } from "../types";

const STORAGE_KEY = "guidedReview.githubAuth";

function isGitHubAuthState(value: unknown): value is GitHubAuthState {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.accessToken === "string" &&
    v.accessToken.length > 0 &&
    typeof v.tokenType === "string" &&
    typeof v.scope === "string" &&
    typeof v.login === "string" &&
    v.login.length > 0
  );
}

/** Read the stored GitHub OAuth session, or null if none / invalid. */
export async function getGitHubAuth(): Promise<GitHubAuthState | null> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const stored = result[STORAGE_KEY];
  if (!isGitHubAuthState(stored)) return null;
  return {
    accessToken: stored.accessToken,
    tokenType: stored.tokenType,
    scope: stored.scope,
    login: stored.login,
    ...(typeof stored.avatarUrl === "string" ? { avatarUrl: stored.avatarUrl } : {}),
    ...(typeof stored.name === "string" ? { name: stored.name } : {}),
  };
}

export async function setGitHubAuth(auth: GitHubAuthState): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: auth });
}

export async function clearGitHubAuth(): Promise<void> {
  await chrome.storage.local.remove(STORAGE_KEY);
}
