/** Conversation (default) tab URL for a PR. */
export function prConversationUrl(pr: { owner: string; repo: string; number: number }): string {
  return `https://github.com/${pr.owner}/${pr.repo}/pull/${pr.number}`;
}

/**
 * True when `pathname` is already the PR conversation tab
 * (not /files, /commits, /checks, etc.).
 */
export function isPrConversationPath(
  pathname: string,
  pr: { owner: string; repo: string; number: number },
): boolean {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  const expected = `/${pr.owner}/${pr.repo}/pull/${pr.number}`;
  return normalized === expected;
}

/**
 * Navigate to the conversation tab if the user is on another PR tab.
 * No-op when already on conversation. Uses a full navigation so GitHub's
 * SPA shell reliably shows the default PR surface after overlay exit.
 */
export function navigateToPrConversation(pr: {
  owner: string;
  repo: string;
  number: number;
}): void {
  if (isPrConversationPath(window.location.pathname, pr)) return;
  window.location.assign(prConversationUrl(pr));
}
