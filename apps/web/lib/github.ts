/** Owner/repo path for the GitHub REST API (matches GITHUB_REPO_URL in ./links). */
const GITHUB_REPO_PATH = "nshntarora/guidedreview";

/**
 * Fetches the live stargazer count for the repo. Returns null on any failure
 * (network error, rate limit, bad shape) — callers must render without it.
 */
export async function getGitHubStarCount(): Promise<number | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO_PATH}`, {
      headers: { Accept: "application/vnd.github+json" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data: unknown = await res.json();
    if (
      typeof data === "object" &&
      data !== null &&
      "stargazers_count" in data &&
      typeof (data as { stargazers_count: unknown }).stargazers_count === "number"
    ) {
      return (data as { stargazers_count: number }).stargazers_count;
    }
    return null;
  } catch {
    return null;
  }
}
