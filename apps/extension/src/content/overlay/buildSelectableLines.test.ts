import { describe, expect, it } from "vitest";
import type { DiffFile, DiffHunk } from "@extension/lib/types";
import { buildSelectableLines } from "./buildSelectableLines";
import type { ResolvedUnitFile } from "./buildSelectableLines";

function hunkFixture(overrides: Partial<DiffHunk> = {}): DiffHunk {
  return {
    id: "src/foo.ts#0",
    header: "@@ -1,3 +1,4 @@",
    oldStart: 1,
    oldLines: 3,
    newStart: 1,
    newLines: 4,
    lines: [
      { type: "context", content: "const a = 1;", oldLine: 1, newLine: 1 },
      { type: "del", content: "const b = 2;", oldLine: 2 },
      { type: "add", content: "const b = 3;", newLine: 2 },
      { type: "add", content: "const c = 4;", newLine: 3 },
      { type: "context", content: "export { a, b };", oldLine: 3, newLine: 4 },
    ],
    ...overrides,
  };
}

function fileFixture(overrides: Partial<DiffFile> = {}): DiffFile {
  return {
    path: "src/foo.ts",
    status: "modified",
    isBinaryOrElided: false,
    hunks: [hunkFixture()],
    ...overrides,
  };
}

function resolved(files: DiffFile[] = [fileFixture()]): ResolvedUnitFile[] {
  return files.map((file) => ({ file, hunks: file.hunks }));
}

describe("buildSelectableLines", () => {
  it("returns empty for no files", () => {
    expect(buildSelectableLines([], "unified")).toEqual([]);
    expect(buildSelectableLines([], "split")).toEqual([]);
  });

  it("skips binary/elided files", () => {
    const files = resolved([fileFixture({ path: "logo.png", isBinaryOrElided: true, hunks: [] })]);
    expect(buildSelectableLines(files, "unified")).toEqual([]);
  });

  it("unified: one row per line with del→LEFT and add/context→RIGHT", () => {
    const lines = buildSelectableLines(resolved(), "unified");
    expect(lines).toHaveLength(5);
    expect(lines.map((l) => [l.type, l.side, l.id])).toEqual([
      ["context", "RIGHT", "src/foo.ts#0:0:RIGHT"],
      ["del", "LEFT", "src/foo.ts#0:1:LEFT"],
      ["add", "RIGHT", "src/foo.ts#0:2:RIGHT"],
      ["add", "RIGHT", "src/foo.ts#0:3:RIGHT"],
      ["context", "RIGHT", "src/foo.ts#0:4:RIGHT"],
    ]);
    expect(lines[1].oldLine).toBe(2);
    expect(lines[2].newLine).toBe(2);
  });

  it("split: emits only RIGHT content cells per row", () => {
    const lines = buildSelectableLines(resolved(), "split");
    // context R, del+add pair: R only, add-only R, context R → 4
    expect(lines).toHaveLength(4);
    expect(lines.every((l) => l.side === "RIGHT")).toBe(true);
    expect(lines.map((l) => [l.type, l.id])).toEqual([
      ["context", "src/foo.ts#0:0:RIGHT"],
      ["add", "src/foo.ts#0:2:RIGHT"],
      ["add", "src/foo.ts#0:3:RIGHT"],
      ["context", "src/foo.ts#0:4:RIGHT"],
    ]);
    expect(lines[2]).toMatchObject({
      type: "add",
      side: "RIGHT",
      newLine: 3,
      lineIndex: 3,
    });
  });

  it("split: pure deletions emit no selectable lines", () => {
    const files = resolved([
      fileFixture({
        path: "gone.ts",
        hunks: [
          hunkFixture({
            id: "gone.ts#0",
            lines: [
              { type: "del", content: "a", oldLine: 1 },
              { type: "del", content: "b", oldLine: 2 },
            ],
          }),
        ],
      }),
    ]);
    const lines = buildSelectableLines(files, "split");
    expect(lines).toHaveLength(0);
  });

  it("walks multiple files in order", () => {
    const files = resolved([
      fileFixture({
        path: "a.ts",
        hunks: [hunkFixture({ id: "a.ts#0", lines: [{ type: "add", content: "x", newLine: 1 }] })],
      }),
      fileFixture({
        path: "b.ts",
        hunks: [hunkFixture({ id: "b.ts#0", lines: [{ type: "add", content: "y", newLine: 1 }] })],
      }),
    ]);
    const lines = buildSelectableLines(files, "unified");
    expect(lines.map((l) => l.filePath)).toEqual(["a.ts", "b.ts"]);
  });
});
