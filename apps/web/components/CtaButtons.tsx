import { buttonClassName, type ButtonSize } from "@guided-review/ui";
import { ariaKeyShortcuts, SITE_SHORTCUTS } from "../lib/shortcuts";
import { GitHubIcon } from "./icons";
import { ShortcutChord } from "./ShortcutChord";

type CtaButtonProps = {
  size?: ButtonSize;
  /** Shorter label for tight header nav. */
  compact?: boolean;
};

export function InstallButton({ size = "lg", compact = false }: CtaButtonProps) {
  const { key, href, label } = SITE_SHORTCUTS.install;
  const displayLabel = compact ? "Install" : label;
  return (
    <a
      href={href}
      className={buttonClassName({ size })}
      target="_blank"
      rel="noopener noreferrer"
      aria-keyshortcuts={ariaKeyShortcuts(key)}
      aria-label={displayLabel}
    >
      {displayLabel}
      <ShortcutChord keyLabel={key} />
    </a>
  );
}

export function StarOnGitHubButton({ size = "lg", compact = false }: CtaButtonProps) {
  const { key, href, label } = SITE_SHORTCUTS.star;
  return (
    <a
      href={href}
      className={buttonClassName({ variant: "secondary", size })}
      target="_blank"
      rel="noopener noreferrer"
      aria-keyshortcuts={ariaKeyShortcuts(key)}
      aria-label={label}
    >
      <GitHubIcon className="h-4 w-4" />
      {compact ? <span className="hidden sm:inline">Star</span> : label}
      <ShortcutChord keyLabel={key} />
    </a>
  );
}
