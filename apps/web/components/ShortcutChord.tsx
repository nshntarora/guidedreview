"use client";

import { Fragment, useSyncExternalStore } from "react";
import { isMacPlatform, Kbd, KbdGroup } from "@guided-review/ui";

function subscribe() {
  return () => {};
}

function getServerSnapshot() {
  // Prefer ⌘ for SSR; client hydrates to the real platform immediately.
  return true;
}

/**
 * Renders a ⌘/Ctrl + key chord as adjacent kbd badges.
 */
export function ShortcutChord({ keyLabel }: { keyLabel: string }) {
  const isMac = useSyncExternalStore(subscribe, isMacPlatform, getServerSnapshot);
  const keys = [isMac ? "⌘" : "Ctrl", keyLabel.toUpperCase()];

  return (
    <KbdGroup aria-hidden="true" className="max-sm:hidden">
      {keys.map((key, i) => (
        <Fragment key={`${key}-${i}`}>
          {i > 0 ? (
            <span className="text-xs opacity-70" aria-hidden="true">
              +
            </span>
          ) : null}
          <Kbd>{key}</Kbd>
        </Fragment>
      ))}
    </KbdGroup>
  );
}
