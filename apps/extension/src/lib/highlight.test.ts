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
});
