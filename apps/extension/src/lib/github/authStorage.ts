import type { GitHubAuthState } from "@extension/lib/types";
import { readLocal, removeLocal, writeLocal } from "@extension/lib/storage";

const STORAGE_KEY = "guidedReview.githubAuth";

/** Stored sessions missing any required field are treated as absent. */
function parseAuth(value: unknown): GitHubAuthState | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (
    typeof v.accessToken !== "string" ||
    v.accessToken.length === 0 ||
    typeof v.tokenType !== "string" ||
    typeof v.scope !== "string" ||
    typeof v.login !== "string" ||
    v.login.length === 0
  ) {
    return null;
  }

  return {
    accessToken: v.accessToken,
    tokenType: v.tokenType,
    scope: v.scope,
    login: v.login,
    ...(typeof v.avatarUrl === "string" ? { avatarUrl: v.avatarUrl } : {}),
    ...(typeof v.name === "string" ? { name: v.name } : {}),
  };
}

/** Read the stored GitHub OAuth session, or null if none / invalid. */
export function getGitHubAuth(): Promise<GitHubAuthState | null> {
  return readLocal(STORAGE_KEY, parseAuth);
}

export function setGitHubAuth(auth: GitHubAuthState): Promise<void> {
  return writeLocal(STORAGE_KEY, auth);
}

export function clearGitHubAuth(): Promise<void> {
  return removeLocal(STORAGE_KEY);
}
