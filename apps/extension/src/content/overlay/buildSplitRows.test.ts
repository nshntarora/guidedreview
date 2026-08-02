import { describe, expect, it } from "vitest";
import type { DiffLine } from "@extension/lib/types";
import { buildSplitRows } from "./buildSplitRows";

describe("buildSplitRows", () => {
  it("returns empty for an empty hunk", () => {
    expect(buildSplitRows([])).toEqual([]);
  });

  it("mirrors pure context lines on both sides", () => {
    const lines: DiffLine[] = [
      { type: "context", content: "const a = 1;", oldLine: 1, newLine: 1 },
      { type: "context", content: "export { a };", oldLine: 2, newLine: 2 },
    ];

    expect(buildSplitRows(lines)).toEqual([
      {
        left: {
          kind: "content",
          type: "context",
          content: "const a = 1;",
          lineNumber: 1,
          sourceIndex: 0,
        },
        right: {
          kind: "content",
          type: "context",
          content: "const a = 1;",
          lineNumber: 1,
          sourceIndex: 0,
        },
      },
      {
        left: {
          kind: "content",
          type: "context",
          content: "export { a };",
          lineNumber: 2,
          sourceIndex: 1,
        },
        right: {
          kind: "content",
          type: "context",
          content: "export { a };",
          lineNumber: 2,
          sourceIndex: 1,
        },
      },
    ]);
  });

  it("pairs a 1:1 replace", () => {
    const lines: DiffLine[] = [
      { type: "del", content: "old", oldLine: 1 },
      { type: "add", content: "new", newLine: 1 },
    ];

    expect(buildSplitRows(lines)).toEqual([
      {
        left: {
          kind: "content",
          type: "del",
          content: "old",
          lineNumber: 1,
          sourceIndex: 0,
        },
        right: {
          kind: "content",
          type: "add",
          content: "new",
          lineNumber: 1,
          sourceIndex: 1,
        },
      },
    ]);
  });

  it("pairs N deletes with M adds and pads the shorter side", () => {
    const lines: DiffLine[] = [
      { type: "context", content: "const a = 1;", oldLine: 1, newLine: 1 },
      { type: "del", content: "const b = 2;", oldLine: 2 },
      { type: "add", content: "const b = 3;", newLine: 2 },
      { type: "add", content: "const c = 4;", newLine: 3 },
      { type: "context", content: "export { a, b };", oldLine: 3, newLine: 4 },
    ];

    const rows = buildSplitRows(lines);
    expect(rows).toHaveLength(4);

    expect(rows[0].left).toMatchObject({ type: "context", content: "const a = 1;" });
    expect(rows[0].right).toMatchObject({ type: "context", content: "const a = 1;" });

    expect(rows[1].left).toMatchObject({
      type: "del",
      content: "const b = 2;",
      sourceIndex: 1,
    });
    expect(rows[1].right).toMatchObject({
      type: "add",
      content: "const b = 3;",
      sourceIndex: 2,
    });

    expect(rows[2].left).toEqual({ kind: "empty" });
    expect(rows[2].right).toMatchObject({
      type: "add",
      content: "const c = 4;",
      sourceIndex: 3,
    });

    expect(rows[3].left).toMatchObject({ type: "context", content: "export { a, b };" });
    expect(rows[3].right).toMatchObject({ type: "context", content: "export { a, b };" });
  });

  it("pads left when there are more deletes than adds", () => {
    const lines: DiffLine[] = [
      { type: "del", content: "a", oldLine: 1 },
      { type: "del", content: "b", oldLine: 2 },
      { type: "add", content: "A", newLine: 1 },
    ];

    const rows = buildSplitRows(lines);
    expect(rows).toEqual([
      {
        left: {
          kind: "content",
          type: "del",
          content: "a",
          lineNumber: 1,
          sourceIndex: 0,
        },
        right: {
          kind: "content",
          type: "add",
          content: "A",
          lineNumber: 1,
          sourceIndex: 2,
        },
      },
      {
        left: {
          kind: "content",
          type: "del",
          content: "b",
          lineNumber: 2,
          sourceIndex: 1,
        },
        right: { kind: "empty" },
      },
    ]);
  });

  it("renders pure additions with empty left cells", () => {
    const lines: DiffLine[] = [
      { type: "add", content: "const x = 1;", newLine: 1 },
      { type: "add", content: "export default x;", newLine: 2 },
    ];

    expect(buildSplitRows(lines)).toEqual([
      {
        left: { kind: "empty" },
        right: {
          kind: "content",
          type: "add",
          content: "const x = 1;",
          lineNumber: 1,
          sourceIndex: 0,
        },
      },
      {
        left: { kind: "empty" },
        right: {
          kind: "content",
          type: "add",
          content: "export default x;",
          lineNumber: 2,
          sourceIndex: 1,
        },
      },
    ]);
  });

  it("renders pure deletions with empty right cells", () => {
    const lines: DiffLine[] = [{ type: "del", content: "gone", oldLine: 1 }];

    expect(buildSplitRows(lines)).toEqual([
      {
        left: {
          kind: "content",
          type: "del",
          content: "gone",
          lineNumber: 1,
          sourceIndex: 0,
        },
        right: { kind: "empty" },
      },
    ]);
  });

  it("treats interleaved change blocks separated by context as separate blocks", () => {
    const lines: DiffLine[] = [
      { type: "del", content: "a", oldLine: 1 },
      { type: "add", content: "A", newLine: 1 },
      { type: "context", content: "mid", oldLine: 2, newLine: 2 },
      { type: "del", content: "b", oldLine: 3 },
      { type: "add", content: "B", newLine: 3 },
    ];

    const rows = buildSplitRows(lines);
    expect(rows).toHaveLength(3);
    expect(rows[0].left).toMatchObject({ content: "a" });
    expect(rows[0].right).toMatchObject({ content: "A" });
    expect(rows[1].left).toMatchObject({ content: "mid", type: "context" });
    expect(rows[2].left).toMatchObject({ content: "b" });
    expect(rows[2].right).toMatchObject({ content: "B" });
  });
});
