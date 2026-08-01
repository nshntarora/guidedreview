import { describe, expect, it } from "vitest";
import { fallbackMatchRanges, highlightSegments } from "./highlightMatch";

describe("highlightSegments", () => {
  it("returns the full text unhighlighted when ranges are empty", () => {
    expect(highlightSegments("hello world", undefined)).toEqual([
      { text: "hello world", highlight: false },
    ]);
    expect(highlightSegments("hello world", [])).toEqual([
      { text: "hello world", highlight: false },
    ]);
  });

  it("splits around inclusive Fuse ranges", () => {
    // highlight "world" in "hello world"
    expect(highlightSegments("hello world", [[6, 10]])).toEqual([
      { text: "hello ", highlight: false },
      { text: "world", highlight: true },
    ]);
  });

  it("merges overlapping ranges", () => {
    expect(
      highlightSegments("abcdefgh", [
        [1, 3],
        [2, 5],
      ]),
    ).toEqual([
      { text: "a", highlight: false },
      { text: "bcdef", highlight: true },
      { text: "gh", highlight: false },
    ]);
  });
});

describe("fallbackMatchRanges", () => {
  it("finds a case-insensitive substring", () => {
    expect(fallbackMatchRanges("export function Foo", "foo")).toEqual([[16, 18]]);
  });

  it("returns empty when absent", () => {
    expect(fallbackMatchRanges("hello", "xyz")).toEqual([]);
    expect(fallbackMatchRanges("hello", "")).toEqual([]);
  });
});
