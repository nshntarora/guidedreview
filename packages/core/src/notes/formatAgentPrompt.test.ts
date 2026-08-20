import { describe, expect, it } from "vitest";
import { formatAgentPrompt } from "./formatAgentPrompt";

describe("formatAgentPrompt", () => {
  it("returns empty string when there are no notes", () => {
    expect(formatAgentPrompt([])).toBe("");
  });

  it("renders instructions, paths, line ranges, code, and bodies", () => {
    const prompt = formatAgentPrompt([
      {
        filePath: "src/foo.ts",
        startLine: 12,
        endLine: 18,
        body: "Why is this async?",
        selectedCode: "const x = await load();\nreturn x;",
      },
      {
        filePath: "src/bar.ts",
        startLine: 3,
        endLine: 3,
        body: "Handle the error case.",
        selectedCode: "return null;",
      },
    ]);

    expect(prompt).toBe(
      [
        "# Review feedback to apply",
        "",
        "Fix or resolve the feedback below in this repository. If a comment asks a question, answer it and propose an approach to improve the code before (or as part of) making changes.",
        "",
        "## Comments",
        "",
        "### `src/foo.ts` (L12–L18)",
        "",
        "Selected code:",
        "",
        "```",
        "const x = await load();",
        "return x;",
        "```",
        "",
        "Feedback:",
        "",
        "Why is this async?",
        "",
        "### `src/bar.ts` (L3)",
        "",
        "Selected code:",
        "",
        "```",
        "return null;",
        "```",
        "",
        "Feedback:",
        "",
        "Handle the error case.",
        "",
      ].join("\n"),
    );
  });

  it("omits the Selected code subsection when code is missing", () => {
    const prompt = formatAgentPrompt([
      { filePath: "a.ts", startLine: 1, endLine: 1, body: "Look here" },
    ]);

    expect(prompt).not.toContain("Selected code:");
    expect(prompt).toContain("### `a.ts` (L1)");
    expect(prompt).toContain("Feedback:\n\nLook here\n");
  });

  it("trims note bodies and selected code", () => {
    const prompt = formatAgentPrompt([
      {
        filePath: "a.ts",
        startLine: 1,
        endLine: 1,
        body: "  padded  \n",
        selectedCode: "  code  \n",
      },
    ]);
    expect(prompt).toContain("\n```\ncode\n```\n");
    expect(prompt).toContain("\nFeedback:\n\npadded\n");
  });
});
