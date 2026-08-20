/**
 * Incrementally extracts complete objects from a streaming JSON document of
 * the form `{ "units": [ {...}, {...} ] }`.
 *
 * Only fully closed top-level objects inside the `units` array are emitted.
 * Incomplete trailing objects stay buffered until more text arrives (or
 * `finish()` runs a final full-document parse as a safety net).
 *
 * Emitted values are unvalidated — this class only finds object boundaries.
 * Callers pass each one to `parseReviewUnit` to check it against the diff.
 */
export class StreamPlanParser {
  private buffer = "";
  private unitsArrayStart = -1;
  private scanPos = 0;
  /**
   * How many elements of the `units` array the incremental scanner has walked
   * past — including ones it declined to emit. This is an array offset, not an
   * emission tally: `finish()`'s full-document parse resumes from here, so
   * counting only emitted units would make it re-emit everything after the
   * first unit the scanner skipped.
   */
  private scannedCount = 0;

  /** Feed a text delta from the provider stream. Returns newly completed units. */
  push(delta: string): unknown[] {
    if (!delta) return [];
    this.buffer += delta;
    return this.extractCompletedUnits();
  }

  /**
   * Call when the provider stream ends. Emits any remaining complete units
   * via a final full-document parse if the incremental scanner missed them.
   */
  finish(): unknown[] {
    const fromScan = this.extractCompletedUnits();

    // Safety net: structured output should be complete JSON by stream end, so
    // full-parse whatever the incremental scanner never reached. Runs even when
    // the scan just emitted something — the two can each recover different
    // units from the same call, and `scannedCount` keeps them from overlapping.
    let fromFullParse: unknown[] = [];
    try {
      const parsed = JSON.parse(this.buffer) as { units?: unknown };
      if (Array.isArray(parsed.units)) {
        fromFullParse = parsed.units.slice(this.scannedCount);
        this.scannedCount = parsed.units.length;
      }
    } catch {
      fromFullParse = [];
    }

    return [...fromScan, ...fromFullParse];
  }

  private extractCompletedUnits(): unknown[] {
    if (this.unitsArrayStart < 0) {
      const start = findUnitsArrayStart(this.buffer);
      if (start < 0) return [];
      this.unitsArrayStart = start;
      this.scanPos = start;
    }

    const emitted: unknown[] = [];

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
      // Counted whether or not it survives validation below — this element of
      // the array has been consumed either way.
      this.scannedCount++;

      try {
        emitted.push(JSON.parse(slice) as unknown);
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
