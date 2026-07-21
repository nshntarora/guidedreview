/**
 * Shared button styling for the overlay's dialogs. Only classes that were
 * byte-identical across two or more modals live here — primary/accent
 * buttons intentionally keep small per-modal variations (gap, disabled
 * opacity) and are not merged, to avoid a cosmetic behavior change.
 */
export const secondaryModalBtn =
  "inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-gr-border bg-gr-bg px-3 py-1.5 text-base text-gr-muted hover:bg-gr-subtle hover:text-gr-text disabled:cursor-not-allowed disabled:opacity-50";
