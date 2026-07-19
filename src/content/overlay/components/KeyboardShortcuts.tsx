import { Kbd } from "./Kbd";

const SHORTCUTS = [
  { keys: ["←", "→"], description: "Previous / next step" },
  { keys: ["↑", "↓"], description: "Scroll the code pane" },
  { keys: ["Esc"], description: "Exit the review" },
] as const;

export function KeyboardShortcuts() {
  return (
    <div className="gr-keyboard-shortcuts" aria-label="Keyboard shortcuts">
      <div className="gr-context-panel-label">Keyboard shortcuts</div>
      <ul className="gr-keyboard-shortcuts-list">
        {SHORTCUTS.map(({ keys, description }) => (
          <li key={description} className="gr-keyboard-shortcuts-row">
            <span className="gr-keyboard-shortcuts-keys">
              {keys.map((key) => (
                <Kbd key={key}>{key}</Kbd>
              ))}
            </span>
            <span className="gr-keyboard-shortcuts-desc">{description}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
