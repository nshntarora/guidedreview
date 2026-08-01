/**
 * Named marketing-site events. Prefer these constants over string literals
 * so providers stay consistent and refactors stay greppable.
 */
export const AnalyticsEvents = {
  INSTALL_EXTENSION_CLICK: "install_extension_click",
  GITHUB_STAR_CLICK: "github_star_click",
} as const;

/**
 * Known CTA placement ids. Free-form strings are also allowed so new surfaces
 * do not require a type change.
 */
export type CtaLocation = "header" | "hero" | "install_cta" | "keyboard" | (string & {});

/**
 * Base properties every CTA click should include. Callers may attach any extra
 * fields (size, compact, section, experiment, …) as a custom object.
 */
export type CtaEventProperties = {
  location: CtaLocation;
} & Record<string, unknown>;
