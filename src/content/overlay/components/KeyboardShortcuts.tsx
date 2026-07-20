import { ShortcutKeys, type ShortcutJoin } from "./ShortcutKeys";

/**
 * Nested key groups for mixed joins (e.g. ⇧ + ↑ ↓ for multi-line select).
 * Flat `keys` + `join` covers the common cases.
 */
type ShortcutRow =
  | {
      description: string;
      keys: readonly string[];
      join?: ShortcutJoin;
    }
  | {
      description: string;
      /** Chord of a modifier plus an alternative pair (no + between the pair). */
      chordWithAlternatives: {
        modifier: string;
        alternatives: readonly string[];
      };
    };

const SHORTCUTS: readonly ShortcutRow[] = [
  { keys: ["←", "→"], join: "none", description: "Previous / next step" },
  { keys: ["↑", "↓"], join: "none", description: "Scroll the code pane" },
  { keys: ["v", "u"], join: "sequence", description: "Unified view" },
  { keys: ["v", "s"], join: "sequence", description: "Split view" },
  { keys: ["c"], join: "none", description: "Enter comment mode" },
  { keys: ["↑", "↓"], join: "none", description: "Select lines (in comment mode)" },
  {
    description: "Multi-line select (comment mode)",
    chordWithAlternatives: { modifier: "⇧", alternatives: ["↑", "↓"] },
  },
  { keys: ["Enter"], join: "none", description: "Open comment on selection" },
  {
    keys: ["mod", "Enter"],
    join: "chord",
    description: "Open / submit review (save draft in composer)",
  },
  { keys: ["Esc"], join: "none", description: "Exit comment mode / exit review" },
];

function ShortcutRowKeys({ row }: { row: ShortcutRow }) {
  if ("chordWithAlternatives" in row) {
    const { modifier, alternatives } = row.chordWithAlternatives;
    return (
      <span className="inline-flex items-center gap-1">
        <ShortcutKeys keys={[modifier]} join="none" />
        <span className="text-xs opacity-70" aria-hidden="true">
          +
        </span>
        <ShortcutKeys keys={alternatives} join="none" />
      </span>
    );
  }
  return <ShortcutKeys keys={row.keys} join={row.join} />;
}

export function KeyboardShortcuts() {
  return (
    <section
      className="mt-4 border-t border-gr-border-muted pt-3"
      aria-labelledby="keyboard-shortcuts-heading"
    >
      <h2
        id="keyboard-shortcuts-heading"
        className="mb-2 text-xs font-semibold tracking-[0.04em] text-gr-muted uppercase"
      >
        Keyboard shortcuts
      </h2>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {SHORTCUTS.map((row) => (
          <li key={row.description} className="flex items-center gap-3 text-base text-gr-muted">
            <span className="inline-flex min-w-[72px] shrink-0 items-center gap-1">
              <ShortcutRowKeys row={row} />
            </span>
            <span>{row.description}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
