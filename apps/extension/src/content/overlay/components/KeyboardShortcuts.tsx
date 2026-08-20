import { Kbd, KbdGroup } from "@guided-review/ui";
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
  {
    keys: ["mod", "F"],
    join: "chord",
    description: "Search files and code in this PR",
  },
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

const LOCAL_SHORTCUTS: readonly ShortcutRow[] = SHORTCUTS.map((row) =>
  "keys" in row && row.keys[0] === "Esc"
    ? { keys: ["Esc"], join: "none" as const, description: "Exit comment mode" }
    : row,
);

const SETTINGS_SHORTCUT: ShortcutRow = {
  keys: ["mod", ","],
  join: "chord",
  description: "Open settings",
};

const SCOPE_PICKER_SHORTCUT: ShortcutRow = {
  keys: ["d"],
  join: "none",
  description: "Choose which diff to review",
};

const STRUCTURE_REVIEW_SHORTCUT: ShortcutRow = {
  keys: ["mod", "I"],
  join: "chord",
  description: "Structure with AI",
};

function ShortcutRowKeys({ row }: { row: ShortcutRow }) {
  if ("chordWithAlternatives" in row) {
    const { modifier, alternatives } = row.chordWithAlternatives;
    return (
      <KbdGroup>
        <Kbd>{modifier}</Kbd>
        <span className="text-xs opacity-70" aria-hidden="true">
          +
        </span>
        {alternatives.map((key) => (
          <Kbd key={key}>{key}</Kbd>
        ))}
      </KbdGroup>
    );
  }
  return <ShortcutKeys keys={row.keys} join={row.join} />;
}

export function KeyboardShortcuts({
  allowExit = true,
  showSettings = false,
  showScopePicker = false,
  showStructureReview = false,
}: {
  allowExit?: boolean;
  showSettings?: boolean;
  showScopePicker?: boolean;
  showStructureReview?: boolean;
}) {
  const rows = [
    ...(showSettings ? [SETTINGS_SHORTCUT] : []),
    ...(showScopePicker ? [SCOPE_PICKER_SHORTCUT] : []),
    ...(showStructureReview ? [STRUCTURE_REVIEW_SHORTCUT] : []),
    ...(allowExit ? SHORTCUTS : LOCAL_SHORTCUTS),
  ];
  return (
    <section
      className="mt-4 border-t border-border-strong pt-3"
      aria-labelledby="keyboard-shortcuts-heading"
    >
      <h2
        id="keyboard-shortcuts-heading"
        className="mb-2 text-xs font-semibold tracking-[0.04em] text-muted uppercase"
      >
        Keyboard Shortcuts
      </h2>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {rows.map((row) => (
          <li key={row.description} className="flex items-center gap-3 text-base text-muted">
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
