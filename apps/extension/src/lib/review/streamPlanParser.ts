import type { ReviewUnit } from "../types";
import { isCompleteReviewUnit } from "./reviewPlan";

/**
 * Incrementally extracts complete `ReviewUnit` objects from a streaming
 * JSON document of the form `{ "units": [ {...}, {...} ] }`.
 *
 * Only fully closed top-level objects inside the `units` array are emitted.
 * Incomplete trailing objects stay buffered until more text arrives (or
 * `finish()` runs a final full-document parse as a safety net).
 */
export class StreamPlanParser {
  private buffer = "";
  private unitsArrayStart = -1;
  private scanPos = 0;
  private emittedCount = 0;

  /** Feed a text delta from the provider stream. Returns newly completed units. */
  push(delta: string): ReviewUnit[] {
    if (!delta) return [];
    this.buffer += delta;
    return this.extractCompletedUnits();
  }

  /**
   * Call when the provider stream ends. Emits any remaining complete units
   * via a final full-document parse if the incremental scanner missed them.
   */
  finish(): ReviewUnit[] {
    const fromScan = this.extractCompletedUnits();
    if (fromScan.length > 0) return fromScan;

    // Safety net: structured output should be complete JSON by stream end.
    try {
      const parsed = JSON.parse(this.buffer) as { units?: unknown };
      if (!Array.isArray(parsed.units)) return [];

      const remaining: ReviewUnit[] = [];
      for (let i = this.emittedCount; i < parsed.units.length; i++) {
        const unit = parsed.units[i];
        if (isCompleteReviewUnit(unit)) {
          remaining.push(unit);
          this.emittedCount++;
        }
      }
      return remaining;
    } catch {
      return [];
    }
  }

  /** Full buffered text (for debugging / final validation). */
  getText(): string {
    return this.buffer;
  }

  private extractCompletedUnits(): ReviewUnit[] {
    if (this.unitsArrayStart < 0) {
      const start = findUnitsArrayStart(this.buffer);
      if (start < 0) return [];
      this.unitsArrayStart = start;
      this.scanPos = start;
    }

    const emitted: ReviewUnit[] = [];

    while (this.scanPos < this.buffer.length) {
      // Skip whitespace and commas between array elements.
      const next = skipWsAndCommas(this.buffer, this.scanPos);
      if (next >= this.buffer.length) {
        this.scanPos = next;
        break;
      }

      const ch = this.buffer[next];
      if (ch === "]") {
        // End of units array.
        this.scanPos = next + 1;
        break;
      }

      if (ch !== "{") {
        // Unexpected token — advance one char to avoid infinite loop.
        this.scanPos = next + 1;
        continue;
      }

      const end = findMatchingBrace(this.buffer, next);
      if (end < 0) {
        // Incomplete object — wait for more text.
        this.scanPos = next;
        break;
      }

      const slice = this.buffer.slice(next, end + 1);
      this.scanPos = end + 1;

      try {
        const value: unknown = JSON.parse(slice);
        if (isCompleteReviewUnit(value)) {
          emitted.push(value);
          this.emittedCount++;
        }
      } catch {
        // Malformed complete-looking object; skip it.
      }
    }

    return emitted;
  }
}

/** Locate the `[` that opens the top-level `"units"` array. */
function findUnitsArrayStart(text: string): number {
  // Match "units" then optional whitespace/colon/whitespace then [
  const re = /"units"\s*:\s*\[/;
  const match = re.exec(text);
  if (!match) return -1;
  return match.index + match[0].length - 1; // index of '['
}

function skipWsAndCommas(text: string, start: number): number {
  let i = start;
  while (i < text.length) {
    const c = text[i];
    if (c === " " || c === "\t" || c === "\n" || c === "\r" || c === ",") {
      i++;
      continue;
    }
    break;
  }
  return i;
}

/**
 * Find the index of the `}` that closes the object starting at `openBrace`.
 * String-aware (handles escapes). Returns -1 if the object is incomplete.
 */
function findMatchingBrace(text: string, openBrace: number): number {
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = openBrace; i < text.length; i++) {
    const c = text[i];

    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }
      if (c === "\\") {
        escape = true;
        continue;
      }
      if (c === '"') {
        inString = false;
      }
      continue;
    }

    if (c === '"') {
      inString = true;
      continue;
    }
    if (c === "{") {
      depth++;
      continue;
    }
    if (c === "}") {
      depth--;
      if (depth === 0) return i;
    }
  }

  return -1;
}
