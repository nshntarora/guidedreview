/**
 * OS detection for keyboard-shortcut labels (⌘ vs Ctrl).
 * Reads `navigator` only at call time, so it is safe in the extension's
 * content script and in client components on the marketing site.
 */
export function isMacPlatform(): boolean {
  if (typeof navigator === "undefined") return false;

  const nav = navigator as Navigator & {
    userAgentData?: { platform?: string };
  };
  const platform = nav.userAgentData?.platform ?? nav.platform ?? "";
  if (/Mac|iPhone|iPod|iPad/i.test(platform)) return true;
  return /Mac OS X|Macintosh/i.test(nav.userAgent ?? "");
}
