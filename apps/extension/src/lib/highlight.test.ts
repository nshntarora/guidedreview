import { afterEach, describe, expect, it, vi } from "vitest";
import hljs from "highlight.js/lib/core";
import { highlightToLines } from "./highlight";

describe("highlightToLines", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("HTML-escapes code when hljs.highlight throws, instead of returning it raw", () => {
    // Diff content is attacker-controlled (any PR author writes it), and every
    // returned line is rendered via dangerouslySetInnerHTML in hunkHighlight.tsx
    // — a highlight failure must never fall back to unescaped HTML.
    vi.spyOn(hljs, "highlight").mockImplementation(() => {
      throw new Error("simulated highlight.js failure");
    });

    const malicious = "<img src=x onerror=alert(document.cookie)>";
    const lines = highlightToLines(malicious, "javascript");

    expect(lines).toEqual(["&lt;img src=x onerror=alert(document.cookie)&gt;"]);
    expect(lines[0]).not.toContain("<img");
  });

  it("escapes each line independently and preserves line count on fallback", () => {
    vi.spyOn(hljs, "highlight").mockImplementation(() => {
      throw new Error("simulated highlight.js failure");
    });

    const lines = highlightToLines("<b>one</b>\n<i>two</i> & three", "javascript");

    expect(lines).toEqual(["&lt;b&gt;one&lt;/b&gt;", "&lt;i&gt;two&lt;/i&gt; &amp; three"]);
  });

  it("still returns real highlight.js markup on the non-throwing path", () => {
    const lines = highlightToLines("const x = 1;", "javascript");
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain("<span");
    expect(lines[0]).not.toContain("&lt;span");
  });

  it("re-opens spans that straddle a newline so each line stands alone", () => {
    const lines = highlightToLines("/* one\n two\n three */\nconst x = 1;", "javascript");

    expect(lines).toHaveLength(4);
    // Each line of the block comment must be independently valid HTML: the
    // continuation lines re-open the comment span and close it at line end.
    for (const line of lines.slice(0, 3)) {
      expect(countOccurrences(line, "<span")).toBe(countOccurrences(line, "</span>"));
    }
    expect(lines[1]).toContain("<span");
    expect(lines[1]).toContain("two");
  });

  it("handles a very long single line without truncating or reordering tags", () => {
    // Guards the tag scanner: it walks per character, so a long line must not
    // change the result (and must not degrade to quadratic slicing).
    const long = `const s = "${"a".repeat(20_000)}";`;
    const lines = highlightToLines(long, "javascript");

    expect(lines).toHaveLength(1);
    expect(countOccurrences(lines[0], "<span")).toBe(countOccurrences(lines[0], "</span>"));
    expect(lines[0]).toContain("a".repeat(20_000));
  });
});

function countOccurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}
