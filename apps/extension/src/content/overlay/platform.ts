import { isMacPlatform } from "@guided-review/ui";

/** Primary modifier label for this OS: ⌘ on Apple platforms, Ctrl elsewhere. */
export function modKeyLabel(): "⌘" | "Ctrl" {
  return isMacPlatform() ? "⌘" : "Ctrl";
}
