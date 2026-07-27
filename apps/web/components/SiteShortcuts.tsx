"use client";

import { useEffect } from "react";
import { AnalyticsEvents } from "../lib/analytics";
import { SITE_SHORTCUTS } from "../lib/shortcuts";
import { useAnalytics } from "./analytics/AnalyticsProvider";

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
  const analytics = useAnalytics();

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

      const eventName =
        match === SITE_SHORTCUTS.install
          ? AnalyticsEvents.INSTALL_EXTENSION_CLICK
          : AnalyticsEvents.GITHUB_STAR_CLICK;

      analytics.capture(eventName, {
        location: "keyboard",
        method: "shortcut",
        key: match.key,
        href: match.href,
      });

      window.open(match.href, "_blank", "noopener,noreferrer");
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [analytics]);

  return null;
}
