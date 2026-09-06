import { CHROME_WEB_STORE_URL, GITHUB_REPO_URL, INSTALL_SECTION_HREF } from "./links";

/**
 * Site CTA shortcuts. Keyboard-bound entries require the primary modifier
 * (⌘ on macOS, Ctrl elsewhere). `cli` is link-only (no global shortcut).
 */
export const SITE_SHORTCUTS = {
  install: {
    key: "i",
    href: INSTALL_SECTION_HREF,
    label: "Install",
  },
  extension: {
    key: "e",
    href: CHROME_WEB_STORE_URL,
    label: "Install the Extension",
  },
  /** Nav link to the CLI docs page. */
  installCli: {
    href: "/docs/cli",
    label: "CLI",
  },
  /** Nav link to the Chrome extension docs page. */
  installChrome: {
    href: "/docs/chrome-extension",
    label: "Chrome Extension",
  },
  cli: {
    href: "/docs/cli",
    label: "Try the CLI",
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
