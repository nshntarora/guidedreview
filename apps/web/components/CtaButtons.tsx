"use client";

import { buttonClassName, type ButtonSize } from "@guided-review/ui";
import { AnalyticsEvents, type CtaEventProperties, type CtaLocation } from "@web/lib/analytics";
import { ariaKeyShortcuts, SITE_SHORTCUTS } from "@web/lib/shortcuts";
import { useAnalytics } from "./analytics/AnalyticsProvider";
import { GitHubIcon } from "./icons";
import { ShortcutChord } from "./ShortcutChord";

type CtaButtonProps = {
  size?: ButtonSize;
  /** Shorter label for tight header nav. */
  compact?: boolean;
  /**
   * Where this CTA is rendered (e.g. header, hero, install_cta).
   * Sent as analytics metadata so funnels can split by placement.
   */
  location: CtaLocation;
  /**
   * Extra properties merged into the click event (custom object).
   * `location` on this object is ignored in favor of the `location` prop.
   */
  eventProperties?: Omit<CtaEventProperties, "location">;
};

function buildCtaProperties(
  location: CtaLocation,
  extras: Omit<CtaEventProperties, "location"> | undefined,
  defaults: Record<string, unknown>,
): CtaEventProperties {
  return {
    ...defaults,
    ...extras,
    location,
  };
}

export function InstallButton({
  size = "lg",
  compact = false,
  location,
  eventProperties,
}: CtaButtonProps) {
  const analytics = useAnalytics();
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
      onClick={() => {
        analytics.capture(
          AnalyticsEvents.INSTALL_EXTENSION_CLICK,
          buildCtaProperties(location, eventProperties, {
            href,
            size,
            compact,
            method: "click",
          }),
        );
      }}
    >
      {displayLabel}
      <ShortcutChord keyLabel={key} />
    </a>
  );
}

export function StarOnGitHubButton({
  size = "lg",
  compact = false,
  location,
  eventProperties,
}: CtaButtonProps) {
  const analytics = useAnalytics();
  const { key, href, label } = SITE_SHORTCUTS.star;

  return (
    <a
      href={href}
      className={buttonClassName({ variant: "secondary", size })}
      target="_blank"
      rel="noopener noreferrer"
      aria-keyshortcuts={ariaKeyShortcuts(key)}
      aria-label={label}
      onClick={() => {
        analytics.capture(
          AnalyticsEvents.GITHUB_STAR_CLICK,
          buildCtaProperties(location, eventProperties, {
            href,
            size,
            compact,
            method: "click",
          }),
        );
      }}
    >
      <GitHubIcon className="h-4 w-4" />
      {compact ? <span className="hidden sm:inline">Star</span> : label}
      <ShortcutChord keyLabel={key} />
    </a>
  );
}
