import { Kbd } from "./Kbd";

const SHORTCUTS = [
  { keys: ["←", "→"], description: "Previous / next step" },
  { keys: ["↑", "↓"], description: "Scroll the code pane" },
  { keys: ["v", "u"], description: "Unified view" },
  { keys: ["v", "s"], description: "Split view" },
  { keys: ["c"], description: "Enter comment mode" },
  { keys: ["↑", "↓"], description: "Select lines (in comment mode)" },
  { keys: ["⇧", "↑", "↓"], description: "Multi-line select (comment mode)" },
  { keys: ["Enter"], description: "Open comment on selection" },
  { keys: ["⌘", "Enter"], description: "Open / submit review (save draft in composer)" },
  { keys: ["Esc"], description: "Exit comment mode / exit review" },
] as const;

export function KeyboardShortcuts() {
  return (
    <div className="mt-4 border-t border-gr-border-muted pt-3" aria-label="Keyboard shortcuts">
      <div className="mb-2 text-xs font-semibold tracking-[0.04em] text-gr-muted uppercase">
        Keyboard shortcuts
      </div>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {SHORTCUTS.map(({ keys, description }) => (
          <li key={description} className="flex items-center gap-3 text-[13px] text-gr-muted">
            <span className="inline-flex min-w-[72px] shrink-0 items-center gap-1">
              {keys.map((key, i) => (
                <Kbd key={`${description}-${key}-${i}`}>{key}</Kbd>
              ))}
            </span>
            <span>{description}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
