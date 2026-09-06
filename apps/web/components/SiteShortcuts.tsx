"use client";

import { useEffect } from "react";
import { AnalyticsEvents } from "@web/lib/analytics";
import { SITE_SHORTCUTS } from "@web/lib/shortcuts";
import { useAnalytics } from "./analytics/AnalyticsProvider";

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

function goToInstallSection() {
  const el = document.getElementById("install");
  if (el) {
    el.scrollIntoView({ behavior: "smooth" });
    if (window.location.hash !== "#install") {
      history.pushState(null, "", "#install");
    }
    return;
  }
  window.location.assign(SITE_SHORTCUTS.install.href);
}

/**
 * Global ⌘/Ctrl-chord shortcuts for marketing CTAs (install / extension / star).
 * Skips when focus is in an editable control.
 *
 * Uses the capture phase + stopImmediatePropagation so we run before other
 * page/content-script bubble listeners. This cannot override a Chrome
 * extension shortcut registered via chrome.commands — those are handled by
 * the browser before the page sees the event (reassign at
 * chrome://extensions/shortcuts).
 */
export function SiteShortcuts() {
  const analytics = useAnalytics();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      // Require primary modifier; reject Alt so Option-modified keys don't fire.
      // Reject Shift so we don't collide with Shift-modified browser/extension chords.
      if (!(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey) return;
      if (event.repeat) return;
      if (isEditableTarget(event.target)) return;

      const key = event.key.toLowerCase();
      const keyed = [
        SITE_SHORTCUTS.install,
        SITE_SHORTCUTS.extension,
        SITE_SHORTCUTS.star,
      ] as const;
      const match = keyed.find((s) => s.key === key);
      if (!match) return;

      event.preventDefault();
      event.stopImmediatePropagation();

      if (match === SITE_SHORTCUTS.install) {
        analytics.capture(AnalyticsEvents.SURFACES_CTA_CLICK, {
          location: "keyboard",
          method: "shortcut",
          key: match.key,
          href: match.href,
        });
        goToInstallSection();
        return;
      }

      const eventName =
        match === SITE_SHORTCUTS.extension
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

    // Capture phase: run before bubble listeners on the page / some content scripts.
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [analytics]);

  return null;
}
