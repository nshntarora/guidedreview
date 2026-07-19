import { Kbd } from "./Kbd";

const SHORTCUTS = [
  { keys: ["←", "→"], description: "Previous / next step" },
  { keys: ["↑", "↓"], description: "Scroll the code pane" },
  { keys: ["Esc"], description: "Exit the review" },
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
            <span className="inline-flex min-w-[52px] shrink-0 items-center gap-1">
              {keys.map((key) => (
                <Kbd key={key}>{key}</Kbd>
              ))}
            </span>
            <span>{description}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
