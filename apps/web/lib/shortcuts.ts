import { CHROME_WEB_STORE_URL, GITHUB_REPO_URL } from "./links";

/**
 * Site CTA shortcuts. All require the primary modifier (⌘ on macOS, Ctrl elsewhere).
 */
export const SITE_SHORTCUTS = {
  install: {
    key: "i",
    href: CHROME_WEB_STORE_URL,
    label: "Install the extension",
  },
  star: {
    key: "g",
    href: GITHUB_REPO_URL,
    label: "Star on GitHub",
  },
} as const;

/** ARIA keyshortcuts value covering both macOS and Windows/Linux. */
export function ariaKeyShortcuts(key: string): string {
  const letter = key.toUpperCase();
  return `Meta+${letter} Control+${letter}`;
}
