/**
 * OS detection for keyboard-shortcut labels (⌘ vs Ctrl).
 * Safe to call from client components only (reads navigator).
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
