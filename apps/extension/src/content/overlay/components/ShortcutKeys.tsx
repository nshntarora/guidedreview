import { Fragment } from "react";
import { Kbd, KbdGroup } from "@guided-review/ui";
import { modKeyLabel } from "../platform";

/**
 * Token for a key badge. Pass `"mod"` for the OS-aware primary modifier
 * (⌘ on macOS, Ctrl elsewhere).
 */
export type ShortcutKey = string;

export type ShortcutJoin = "none" | "sequence" | "chord";

interface ShortcutKeysProps {
  keys: readonly ShortcutKey[];
  /**
   * - `none` / `sequence`: adjacent key badges (sequential presses or alternatives).
   * - `chord`: badges joined with `+` (keys held together).
   */
  join?: ShortcutJoin;
  className?: string;
}

function resolveKey(key: ShortcutKey): string {
  return key === "mod" ? modKeyLabel() : key;
}

/**
 * Renders a keyboard shortcut hint: sequence (`v` `u`) vs chord (`Ctrl` + `Enter`).
 */
export function ShortcutKeys({ keys, join = "none", className }: ShortcutKeysProps) {
  if (keys.length === 0) return null;

  const showPlus = join === "chord";

  return (
    <KbdGroup className={className}>
      {keys.map((key, i) => (
        <Fragment key={`${key}-${i}`}>
          {showPlus && i > 0 ? (
            <span className="text-xs opacity-70" aria-hidden="true">
              +
            </span>
          ) : null}
          <Kbd>{resolveKey(key)}</Kbd>
        </Fragment>
      ))}
    </KbdGroup>
  );
}

/** ⌘/Ctrl + Enter chord, resolved for the current OS. */
export function ModEnterChord({ className }: { className?: string }) {
  return <ShortcutKeys keys={["mod", "Enter"]} join="chord" className={className} />;
}
