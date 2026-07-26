"use client";

import { useEffect } from "react";
import { SITE_SHORTCUTS } from "../lib/shortcuts";

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

/**
 * Global ⌘/Ctrl-chord shortcuts for marketing CTAs (install / star).
 * Skips when focus is in an editable control.
 */
export function SiteShortcuts() {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      // Require primary modifier; reject Alt so Option-modified keys don't fire.
      if (!(event.metaKey || event.ctrlKey) || event.altKey) return;
      if (event.repeat) return;
      if (isEditableTarget(event.target)) return;

      const key = event.key.toLowerCase();
      const match = Object.values(SITE_SHORTCUTS).find((s) => s.key === key);
      if (!match) return;

      event.preventDefault();
      window.open(match.href, "_blank", "noopener,noreferrer");
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return null;
}
