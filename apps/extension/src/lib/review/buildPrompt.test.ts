import { describe, expect, it } from "vitest";
import { buildUserPrompt, chunkDiffByFile, SYSTEM_PROMPT } from "./buildPrompt";
import type { DiffFile, ParsedDiff, PRContext } from "../types";

function fileFixture(path: string, extraLineCount = 0): DiffFile {
  return {
    path,
    status: "modified",
    isBinaryOrElided: false,
    hunks: [
      {
        id: `${path}#0`,
        header: "@@ -1,1 +1,1 @@",
        oldStart: 1,
        oldLines: 1,
        newStart: 1,
        newLines: 1 + extraLineCount,
        lines: [
          { type: "context", content: "unchanged", oldLine: 1, newLine: 1 },
          ...Array.from({ length: extraLineCount }, (_, i) => ({
            type: "add" as const,
            content: `padding line ${i} `.repeat(20),
            newLine: 2 + i,
          })),
        ],
      },
    ],
  };
}

describe("chunkDiffByFile", () => {
  it("keeps small diffs in a single chunk", () => {
    const diff: ParsedDiff = { files: [fileFixture("a.ts"), fileFixture("b.ts")] };
    const chunks = chunkDiffByFile(diff);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].files.map((f) => f.path)).toEqual(["a.ts", "b.ts"]);
  });

  it("splits into multiple chunks once a size threshold is exceeded, never splitting a file's hunks", () => {
    const diff: ParsedDiff = {
      files: [fileFixture("a.ts", 50), fileFixture("b.ts", 50), fileFixture("c.ts", 50)],
    };
    const chunks = chunkDiffByFile(diff, 2000);

    expect(chunks.length).toBeGreaterThan(1);
    // every file appears whole, in exactly one chunk
    const allPaths = chunks.flatMap((c) => c.files.map((f) => f.path));
    expect(allPaths.sort()).toEqual(["a.ts", "b.ts", "c.ts"]);
    for (const chunk of chunks) {
      for (const file of chunk.files) {
        expect(file.hunks).toHaveLength(1);
      }
    }
  });

  it("returns a single empty chunk for an empty diff", () => {
    expect(chunkDiffByFile({ files: [] })).toEqual([{ files: [] }]);
  });

  it("puts a single file exceeding maxChars alone in its own chunk rather than dropping it", () => {
    const diff: ParsedDiff = { files: [fileFixture("huge.ts", 200)] };
    const chunks = chunkDiffByFile(diff, 100);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].files[0].path).toBe("huge.ts");
  });
});

describe("SYSTEM_PROMPT", () => {
  it("requires separate tests units and consistency rules", () => {
    expect(SYSTEM_PROMPT).toContain('kind "tests"');
    expect(SYSTEM_PROMPT.toLowerCase()).toContain("never mix");
    expect(SYSTEM_PROMPT).toContain("exactly one");
    expect(SYSTEM_PROMPT).toContain("model-first");
  });
});

describe("buildUserPrompt", () => {
  const prContext: PRContext = {
    owner: "acme",
    repo: "widgets",
    number: 1,
    url: "https://github.com/acme/widgets/pull/1",
    title: "Add feature X",
    description: "Because reasons",
    descriptionHtml: "<p>Because reasons</p>",
    author: "octocat",
    baseRef: "main",
    headRef: "feature-x",
  };

  it("includes title, description, and branch refs", () => {
    const prompt = buildUserPrompt({ files: [fileFixture("src/foo.ts")] }, prContext);
    expect(prompt).toContain("PR title: Add feature X");
    expect(prompt).toContain("Because reasons");
    expect(prompt).toContain("Merging feature-x into main.");
  });

  it("falls back to a placeholder when there is no description", () => {
    const prompt = buildUserPrompt({ files: [] }, { ...prContext, description: "" });
    expect(prompt).toContain("PR description: (none provided)");
  });

  it("falls back to a placeholder when there is no title", () => {
    const prompt = buildUserPrompt({ files: [] }, { ...prContext, title: "" });
    expect(prompt).toContain("PR title: (none provided)");
  });

  it("treats whitespace-only title and description as missing", () => {
    const prompt = buildUserPrompt(
      { files: [] },
      { ...prContext, title: "   ", description: "  \n  " },
    );
    expect(prompt).toContain("PR title: (none provided)");
    expect(prompt).toContain("PR description: (none provided)");
  });

  it("omits the merge line when either ref is missing", () => {
    const prompt = buildUserPrompt({ files: [] }, { ...prContext, baseRef: "", headRef: "" });
    expect(prompt).not.toContain("Merging");
  });

  it("annotates each hunk with its stable id", () => {
    const prompt = buildUserPrompt({ files: [fileFixture("src/foo.ts")] }, prContext);
    expect(prompt).toContain("[hunk id: src/foo.ts#0]");
    expect(prompt).toContain("### File: src/foo.ts (modified)");
  });

  it("includes a hunk inventory and slice disclaimer", () => {
    const prompt = buildUserPrompt({ files: [fileFixture("src/foo.ts")] }, prContext);
    expect(prompt).toContain("Hunk inventory");
    expect(prompt).toContain("src/foo.ts: src/foo.ts#0");
    expect(prompt).toContain("slice of a larger PR");
    expect(prompt).not.toContain("Checklist before you finish");
  });

  it("marks binary files without dumping hunk content", () => {
    const prompt = buildUserPrompt(
      { files: [{ path: "logo.png", status: "modified", isBinaryOrElided: true, hunks: [] }] },
      prContext,
    );
    expect(prompt).toContain("binary or elided");
  });

  it("labels a renamed file with both paths", () => {
    const prompt = buildUserPrompt(
      { files: [{ ...fileFixture("new.ts"), status: "renamed", previousPath: "old.ts" }] },
      prContext,
    );
    expect(prompt).toContain("renamed from old.ts to new.ts");
  });
});
