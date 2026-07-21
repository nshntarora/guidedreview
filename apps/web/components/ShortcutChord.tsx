"use client";

import { Fragment, useSyncExternalStore } from "react";
import { Kbd } from "@guided-review/ui";
import { isMacPlatform } from "../lib/platform";

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
    <span className="inline-flex items-center gap-1" aria-hidden="true">
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
    </span>
  );
}
