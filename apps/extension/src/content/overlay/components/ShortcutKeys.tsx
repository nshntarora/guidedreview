import { Fragment } from "react";
import { isMacPlatform, Kbd, KbdGroup } from "@guided-review/ui";

export type ShortcutJoin = "none" | "sequence" | "chord";

interface ShortcutKeysProps {
  /**
   * One token per key badge. Pass `"mod"` for the OS-aware primary modifier
   * (⌘ on macOS, Ctrl elsewhere).
   */
  keys: readonly string[];
  /**
   * - `none` / `sequence`: adjacent key badges (sequential presses or alternatives).
   * - `chord`: badges joined with `+` (keys held together).
   */
  join?: ShortcutJoin;
  className?: string;
}

function resolveKey(key: string): string {
  // "mod" is the OS primary modifier: ⌘ on Apple platforms, Ctrl elsewhere.
  return key === "mod" ? (isMacPlatform() ? "⌘" : "Ctrl") : key;
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
