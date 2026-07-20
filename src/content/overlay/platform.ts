/**
 * OS detection for keyboard-shortcut labels (⌘ vs Ctrl).
 * Content-script safe — reads navigator only at call time.
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

/** Primary modifier label for this OS: ⌘ on Apple platforms, Ctrl elsewhere. */
export function modKeyLabel(): "⌘" | "Ctrl" {
  return isMacPlatform() ? "⌘" : "Ctrl";
}
