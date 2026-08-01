/**
 * Split `text` into plain / highlighted segments using inclusive index ranges
 * from Fuse (`includeMatches`). Overlapping ranges are merged.
 */
export type HighlightSegment = { text: string; highlight: boolean };

export function highlightSegments(
  text: string,
  ranges: ReadonlyArray<readonly [number, number]> | undefined,
): HighlightSegment[] {
  if (!text) return [];
  if (!ranges?.length) return [{ text, highlight: false }];

  const merged = mergeRanges(ranges, text.length);
  if (merged.length === 0) return [{ text, highlight: false }];

  const segments: HighlightSegment[] = [];
  let cursor = 0;
  for (const [start, end] of merged) {
    // Fuse indices are inclusive on both ends.
    const from = Math.max(0, start);
    const to = Math.min(text.length, end + 1);
    if (from > cursor) {
      segments.push({ text: text.slice(cursor, from), highlight: false });
    }
    if (to > from) {
      segments.push({ text: text.slice(from, to), highlight: true });
    }
    cursor = Math.max(cursor, to);
  }
  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), highlight: false });
  }
  return segments;
}

/**
 * Fallback when Fuse did not return ranges: case-insensitive substring of the
 * raw query (first occurrence). Returns empty when the query is blank or absent.
 */
export function fallbackMatchRanges(text: string, query: string): Array<[number, number]> {
  const q = query.trim();
  if (!q || !text) return [];
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx < 0) return [];
  return [[idx, idx + q.length - 1]];
}

function mergeRanges(
  ranges: ReadonlyArray<readonly [number, number]>,
  textLength: number,
): Array<[number, number]> {
  const sorted = ranges
    .map(([a, b]) => {
      const start = Math.min(a, b);
      const end = Math.max(a, b);
      return [Math.max(0, start), Math.min(textLength - 1, end)] as [number, number];
    })
    .filter(([start, end]) => start <= end && textLength > 0)
    .sort((x, y) => x[0] - y[0] || x[1] - y[1]);

  if (sorted.length === 0) return [];

  const out: Array<[number, number]> = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const [s, e] = sorted[i];
    const last = out[out.length - 1];
    if (s <= last[1] + 1) {
      last[1] = Math.max(last[1], e);
    } else {
      out.push([s, e]);
    }
  }
  return out;
}
