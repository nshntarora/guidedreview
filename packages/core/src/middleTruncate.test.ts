import { describe, expect, it } from "vitest";
import { middleTruncate } from "./middleTruncate";

describe("middleTruncate", () => {
  it("returns the text unchanged when it fits", () => {
    expect(middleTruncate("src/foo.ts", 20)).toBe("src/foo.ts");
    expect(middleTruncate("short", 5)).toBe("short");
  });

  it("keeps the basename intact and truncates only the path prefix", () => {
    const path = "apps/extension/src/content/overlay/components/DescriptionPane.tsx";
    const result = middleTruncate(path, 40);
    expect(result.length).toBe(40);
    expect(result).toContain("…");
    // Basename always fully visible after the final /.
    expect(result.endsWith("/DescriptionPane.tsx")).toBe(true);
    expect(result).toMatch(/^apps\//);
    // Not end-truncated: full basename must appear.
    expect(result).not.toMatch(/Descripti…$/);
  });

  it("never chops the final path segment when there is room for it", () => {
    const path = "src/very/long/path/to/file.ts";
    const result = middleTruncate(path, 20);
    expect(result.endsWith("/file.ts")).toBe(true);
    expect(result).toContain("…");
    expect(result.length).toBe(20);
  });

  it("handles even and odd character budgets for non-path strings", () => {
    const text = "abcdefghij"; // 10
    // max 7 → budget 6 for content + 1 ellipsis → start 3, end 3
    expect(middleTruncate(text, 7)).toBe("abc…hij");
    // max 8 → budget 7 → start 3, end 4 (end-biased)
    expect(middleTruncate(text, 8)).toBe("abc…ghij");
  });

  it("handles rename labels by keeping the final basename", () => {
    const label = "src/very/long/old-name.ts → src/very/long/new-name.ts";
    const result = middleTruncate(label, 30);
    expect(result.length).toBe(30);
    expect(result.endsWith("/new-name.ts")).toBe(true);
    expect(result).toContain("…");
  });

  it("returns empty string for non-positive maxLength", () => {
    expect(middleTruncate("anything", 0)).toBe("");
    expect(middleTruncate("anything", -1)).toBe("");
  });

  it("clamps when maxLength is smaller than the ellipsis", () => {
    expect(middleTruncate("long-path/file.ts", 1)).toBe("…");
  });

  it("falls back to basename with leading ellipsis when prefix cannot fit", () => {
    // basename "file.ts" is 7; with ellipsis fits in 8, no room for prefix chars.
    expect(middleTruncate("long-path/file.ts", 8)).toBe("…file.ts");
  });

  it("keeps only the end when there is no room for a start segment (non-path)", () => {
    // maxLength 2 → ellipsis + 1 end char
    expect(middleTruncate("abcdef", 2)).toBe("…f");
  });

  it("accepts a custom ellipsis", () => {
    expect(middleTruncate("abcdefghij", 7, "...")).toBe("ab...ij");
  });

  it("middle-truncates a long basename when it alone exceeds the budget", () => {
    const path = "dir/verylongfilenamewithoutspaces.ts";
    const result = middleTruncate(path, 12);
    expect(result.length).toBe(12);
    expect(result).toContain("…");
    // Path prefix dropped; basename itself middle-truncated.
    expect(result).not.toContain("/");
  });
});
