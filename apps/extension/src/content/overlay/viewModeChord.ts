import type { DiffViewMode } from "./diffViewMode";

/** Max span (ms) from arming `v` to the second key (`u` / `s`). */
const WINDOW_MS = 1000;

export type ViewChordPending = { armedAt: number } | null;

interface ViewChordResult {
  next: ViewChordPending;
  /** Non-null when the chord completed and a mode should be applied. */
  mode: DiffViewMode | null;
  /** True when this key was part of the chord (armed `v`, or completing `u`/`s`). */
  consumed: boolean;
}

/**
 * Two-key view-mode chord: `v` then `u` → unified, `v` then `s` → split.
 * Caller must filter modifiers; this only interprets the key sequence.
 */
export function recordViewChordKey(
  pending: ViewChordPending,
  key: string,
  now: number,
): ViewChordResult {
  const k = key.length === 1 ? key.toLowerCase() : key;

  if (k === "v") {
    return { next: { armedAt: now }, mode: null, consumed: true };
  }

  const armed = pending !== null && now - pending.armedAt <= WINDOW_MS ? pending : null;

  if (armed) {
    if (k === "u") {
      return { next: null, mode: "unified", consumed: true };
    }
    if (k === "s") {
      return { next: null, mode: "split", consumed: true };
    }
  }

  return { next: null, mode: null, consumed: false };
}
