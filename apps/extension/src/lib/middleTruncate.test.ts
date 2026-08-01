import { describe, expect, it } from "vitest";
import { middleTruncate } from "./middleTruncate";

describe("middleTruncate", () => {
  it("returns the text unchanged when it fits", () => {
    expect(middleTruncate("src/foo.ts", 20)).toBe("src/foo.ts");
    expect(middleTruncate("short", 5)).toBe("short");
  });

  it("places the ellipsis in the middle when truncating", () => {
    const path = "apps/extension/src/content/overlay/components/DescriptionPane.tsx";
    const result = middleTruncate(path, 40);
    expect(result.length).toBe(40);
    expect(result).toContain("…");
    expect(result.startsWith("apps/extension")).toBe(true);
    expect(result.endsWith("DescriptionPane.tsx")).toBe(true);
    // Not end-truncated: last char of full path must still appear.
    expect(result.at(-1)).toBe("x");
    expect(result).not.toMatch(/Descripti…$/);
  });

  it("handles even and odd character budgets", () => {
    const text = "abcdefghij"; // 10
    // max 7 → budget 6 for content + 1 ellipsis → start 3, end 3
    expect(middleTruncate(text, 7)).toBe("abc…hij");
    // max 8 → budget 7 → start 3, end 4 (end-biased)
    expect(middleTruncate(text, 8)).toBe("abc…ghij");
  });

  it("handles rename labels", () => {
    const label = "src/very/long/old-name.ts → src/very/long/new-name.ts";
    const result = middleTruncate(label, 30);
    expect(result.length).toBe(30);
    expect(result.startsWith("src/")).toBe(true);
    expect(result.endsWith(".ts")).toBe(true);
    expect(result).toContain("…");
  });

  it("returns empty string for non-positive maxLength", () => {
    expect(middleTruncate("anything", 0)).toBe("");
    expect(middleTruncate("anything", -1)).toBe("");
  });

  it("clamps when maxLength is smaller than the ellipsis", () => {
    expect(middleTruncate("long-path/file.ts", 1)).toBe("…");
  });

  it("keeps only the end when there is no room for a start segment", () => {
    // maxLength 2 → ellipsis + 1 end char
    expect(middleTruncate("abcdef", 2)).toBe("…f");
  });

  it("accepts a custom ellipsis", () => {
    expect(middleTruncate("abcdefghij", 7, "...")).toBe("ab...ij");
  });
});
