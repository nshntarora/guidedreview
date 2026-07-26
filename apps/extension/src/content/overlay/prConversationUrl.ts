/** Conversation (default) tab URL for a PR. */
export function prConversationUrl(pr: { owner: string; repo: string; number: number }): string {
  return `https://github.com/${pr.owner}/${pr.repo}/pull/${pr.number}`;
}

/**
 * True when `pathname` is the PR Files changed / Changes tab
 * (`.../pull/N/files` or `.../pull/N/changes`, optional trailing segments).
 * GitHub's classic UI uses `/files`; the newer PR UI uses `/changes`.
 */
export function isPrFilesChangedPath(pathname: string): boolean {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  return /\/pull\/\d+\/(?:files|changes)(?:\/|$)/.test(normalized);
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
  // Already on the conversation tab (not /files, /commits, /checks, …).
  const normalized = window.location.pathname.replace(/\/+$/, "") || "/";
  if (normalized === `/${pr.owner}/${pr.repo}/pull/${pr.number}`) return;
  window.location.assign(prConversationUrl(pr));
}
