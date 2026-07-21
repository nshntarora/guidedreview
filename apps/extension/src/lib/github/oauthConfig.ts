/**
 * GitHub OAuth App configuration for the device authorization grant.
 * Client ID is public by design (device flow does not use a client secret).
 * Set VITE_GITHUB_CLIENT_ID at build time.
 */

export const GITHUB_OAUTH_CLIENT_ID: string =
  (import.meta.env.VITE_GITHUB_CLIENT_ID as string | undefined)?.trim() ?? "";

/** Classic OAuth scopes: private/public repo access + profile for connected UI. */
export const GITHUB_OAUTH_SCOPES = "repo read:user";

export function isGitHubOAuthConfigured(): boolean {
  return GITHUB_OAUTH_CLIENT_ID.length > 0;
}
