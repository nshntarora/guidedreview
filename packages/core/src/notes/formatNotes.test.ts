import { describe, expect, it } from "vitest";
import { formatNotesMarkdown } from "./formatNotes";

describe("formatNotesMarkdown", () => {
  it("returns empty string when there are no notes", () => {
    expect(formatNotesMarkdown([])).toBe("");
  });

  it("renders paths, line ranges, and bodies", () => {
    const markdown = formatNotesMarkdown([
      {
        filePath: "src/foo.ts",
        startLine: 12,
        endLine: 18,
        body: "Why this range?",
      },
      {
        filePath: "src/bar.ts",
        startLine: 3,
        endLine: 3,
        body: "Single line.",
      },
    ]);

    expect(markdown).toBe(
      [
        "# Review notes",
        "",
        "## src/foo.ts:L12–L18",
        "",
        "Why this range?",
        "",
        "## src/bar.ts:L3",
        "",
        "Single line.",
        "",
      ].join("\n"),
    );
  });

  it("trims note bodies", () => {
    const markdown = formatNotesMarkdown([
      { filePath: "a.ts", startLine: 1, endLine: 1, body: "  padded  \n" },
    ]);
    expect(markdown).toContain("\n\npadded\n");
  });
});
