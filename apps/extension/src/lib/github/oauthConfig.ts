/**
 * GitHub OAuth App configuration for the device authorization grant.
 * Client ID is public by design (device flow does not use a client secret).
 * Set VITE_GITHUB_CLIENT_ID at build time.
 */

export const GITHUB_OAUTH_CLIENT_ID: string =
  (import.meta.env.VITE_GITHUB_CLIENT_ID as string | undefined)?.trim() ?? "";

/**
 * Classic OAuth scopes: private/public repo access + profile for connected UI.
 *
 * `repo` is intentionally broad (read/write on all of the user's repos,
 * public and private) because the extension supports submitting reviews on
 * private org PRs (see submitReview.ts's SSO-authorization hint) — classic
 * OAuth has no finer-grained scope for "review PRs on private repos only".
 * If that's ever narrowed, migrate to a GitHub App with fine-grained,
 * per-repo `pull_requests: write` permissions instead of downgrading to
 * `public_repo` (which would silently break private-repo review).
 */
export const GITHUB_OAUTH_SCOPES = "repo read:user";

export function isGitHubOAuthConfigured(): boolean {
  return GITHUB_OAUTH_CLIENT_ID.length > 0;
}

/** Build-time env var that carries the client id. Referenced in user-facing copy. */
export const GITHUB_CLIENT_ID_ENV_VAR = "VITE_GITHUB_CLIENT_ID";

/**
 * Shown when a build ships without a client id. The options page and the
 * overlay modal render the same wording as JSX (with the env var in a `code`
 * element); this is the plain-text form for message responses.
 */
export const GITHUB_OAUTH_NOT_CONFIGURED = `GitHub connection isn’t configured in this build. Set ${GITHUB_CLIENT_ID_ENV_VAR} and rebuild.`;
