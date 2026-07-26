import { buttonClassName, type ButtonSize, type Surface } from "@guided-review/ui";
import { ariaKeyShortcuts, SITE_SHORTCUTS } from "../lib/shortcuts";
import { GitHubIcon } from "./icons";
import { ShortcutChord } from "./ShortcutChord";

type CtaButtonProps = {
  size?: ButtonSize;
  surface?: Surface;
  /** Shorter label for tight header nav. */
  compact?: boolean;
};

export function InstallButton({ size = "lg", surface = "app", compact = false }: CtaButtonProps) {
  const { key, href, label } = SITE_SHORTCUTS.install;
  return (
    <a
      href={href}
      className={buttonClassName({ size, surface })}
      target="_blank"
      rel="noopener noreferrer"
      aria-keyshortcuts={ariaKeyShortcuts(key)}
      aria-label={`${label} (⌘/Ctrl+${key.toUpperCase()})`}
    >
      {compact ? "Install" : label}
      <ShortcutChord keyLabel={key} />
    </a>
  );
}

export function StarOnGitHubButton({
  size = "lg",
  surface = "app",
  compact = false,
}: CtaButtonProps) {
  const { key, href, label } = SITE_SHORTCUTS.star;
  return (
    <a
      href={href}
      className={buttonClassName({ variant: "secondary", size, surface })}
      target="_blank"
      rel="noopener noreferrer"
      aria-keyshortcuts={ariaKeyShortcuts(key)}
      aria-label={`${label} (⌘/Ctrl+${key.toUpperCase()})`}
    >
      <GitHubIcon className="h-4 w-4" />
      {compact ? <span className="hidden sm:inline">Star</span> : label}
      <ShortcutChord keyLabel={key} />
    </a>
  );
}
