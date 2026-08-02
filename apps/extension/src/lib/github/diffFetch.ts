import { parseUnifiedDiff } from "./diffParser";
import type { ParsedDiff } from "@extension/lib/types";

export interface PRIdentity {
  owner: string;
  repo: string;
  number: number;
}

const PR_URL_RE = /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/;

/** Parse the current page URL into a PR identity, or null if not a PR page. */
export function parsePRUrl(url: string): PRIdentity | null {
  const match = PR_URL_RE.exec(url);
  if (!match) return null;
  return { owner: match[1], repo: match[2], number: Number(match[3]) };
}

/**
 * Fetch the raw unified diff for a PR using the user's existing GitHub
 * session cookies (no PAT/token setup required). Falls back to a thrown
 * error with a human-readable message on non-2xx responses so the caller can
 * surface it in the overlay.
 */
export async function fetchPRDiff(pr: PRIdentity): Promise<ParsedDiff> {
  const url = `https://github.com/${pr.owner}/${pr.repo}/pull/${pr.number}.diff`;

  let response: Response;
  try {
    response = await fetch(url, {
      credentials: "include",
      headers: { Accept: "text/plain" },
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Network error fetching the diff from ${url}: ${detail}`, {
      cause: error,
    });
  }

  if (!response.ok) {
    throw new Error(
      `Could not fetch the diff for this PR (HTTP ${response.status}). ` +
        "If this is a private repo, make sure you're signed in to GitHub in this browser.",
    );
  }

  const raw = await response.text();
  return parseUnifiedDiff(raw);
}
