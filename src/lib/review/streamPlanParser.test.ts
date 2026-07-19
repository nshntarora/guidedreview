import { describe, expect, it } from "vitest";
import { StreamPlanParser } from "./streamPlanParser";

const UNIT_A = {
  id: "u1",
  title: "First unit",
  context: "Why first",
  files: [{ fileId: "src/a.ts", hunkIds: ["src/a.ts#0"], role: "core_logic" }],
};

const UNIT_B = {
  id: "u2",
  title: "Second unit",
  context: "Why second",
  files: [{ fileId: "src/b.ts", hunkIds: [], role: "test" }],
};

function fullJson(units: unknown[]): string {
  return JSON.stringify({ units });
}

describe("StreamPlanParser", () => {
  it("emits nothing until a complete unit object is available", () => {
    const parser = new StreamPlanParser();
    expect(parser.push('{"units":[')).toEqual([]);
    expect(parser.push('{"id":"u1","title":"First')).toEqual([]);
    expect(parser.push(' unit","context":"Why first","files":[')).toEqual([]);
  });

  it("emits a unit as soon as its object closes, before the stream ends", () => {
    const parser = new StreamPlanParser();
    const json = fullJson([UNIT_A, UNIT_B]);
    // Feed everything except the final closing braces so the second unit is incomplete.
    const firstUnitEnd = json.indexOf("},") + 1;
    const partial = json.slice(0, firstUnitEnd);

    const units = parser.push(partial);
    expect(units).toHaveLength(1);
    expect(units[0].id).toBe("u1");
    expect(units[0].title).toBe("First unit");
  });

  it("emits units incrementally across many tiny chunks", () => {
    const parser = new StreamPlanParser();
    const json = fullJson([UNIT_A, UNIT_B]);
    const seen: string[] = [];

    for (const ch of json) {
      for (const unit of parser.push(ch)) {
        seen.push(unit.id);
      }
    }
    for (const unit of parser.finish()) {
      seen.push(unit.id);
    }

    expect(seen).toEqual(["u1", "u2"]);
  });

  it("handles escaped quotes inside string fields", () => {
    const unit = {
      id: "u1",
      title: 'Say "hello"',
      context: "path: C:\\foo\\bar",
      files: [{ fileId: "src/a.ts", hunkIds: [], role: "core_logic" }],
    };
    const parser = new StreamPlanParser();
    const units = parser.push(fullJson([unit]));
    expect(units).toHaveLength(1);
    expect(units[0].title).toBe('Say "hello"');
    expect(units[0].context).toBe("path: C:\\foo\\bar");
  });

  it("skips incomplete trailing objects until finish() full-parses if possible", () => {
    const parser = new StreamPlanParser();
    // First unit complete, second truncated mid-object.
    parser.push('{"units":[');
    parser.push(JSON.stringify(UNIT_A));
    parser.push(",");
    parser.push('{"id":"u2","title":"Second');

    const mid = parser.push("");
    // First unit should already have been emitted on the complete object.
    // Re-create to check mid-stream state more carefully:
    const p2 = new StreamPlanParser();
    let emitted = p2.push(`{"units":[${JSON.stringify(UNIT_A)},{"id":"u2","title":"Second`);
    expect(emitted.map((u) => u.id)).toEqual(["u1"]);

    // finish() cannot full-parse incomplete JSON — no second unit.
    expect(p2.finish().map((u) => u.id)).toEqual([]);
    void mid;
  });

  it("finish() recovers units via full parse when the document is complete", () => {
    const parser = new StreamPlanParser();
    // Push the whole document in one go — extract should already emit both.
    const units = parser.push(fullJson([UNIT_A, UNIT_B]));
    expect(units.map((u) => u.id)).toEqual(["u1", "u2"]);
    expect(parser.finish()).toEqual([]);
  });

  it("does not emit objects missing required fields", () => {
    const parser = new StreamPlanParser();
    const incomplete = {
      id: "u1",
      title: "No files",
      // missing context and files
    };
    expect(parser.push(fullJson([incomplete]))).toEqual([]);
  });

  it("handles an empty units array", () => {
    const parser = new StreamPlanParser();
    expect(parser.push('{"units":[]}')).toEqual([]);
    expect(parser.finish()).toEqual([]);
  });

  it("ignores nested braces inside strings when finding object boundaries", () => {
    const unit = {
      id: "u1",
      title: "Uses {braces}",
      context: "also } here { and }",
      files: [{ fileId: "src/a.ts", hunkIds: [], role: "core_logic" }],
    };
    const parser = new StreamPlanParser();
    const units = parser.push(fullJson([unit]));
    expect(units).toHaveLength(1);
    expect(units[0].context).toBe("also } here { and }");
  });
});
