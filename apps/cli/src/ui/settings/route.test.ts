import { describe, expect, it } from "vitest";
import { parseAppHash } from "./route";

describe("parseAppHash", () => {
  it("maps settings and about hashes", () => {
    expect(parseAppHash("#settings")).toBe("settings");
    expect(parseAppHash("#/about")).toBe("about");
    expect(parseAppHash("#ABOUT")).toBe("about");
  });

  it("treats anything else as the review", () => {
    expect(parseAppHash("")).toBe("review");
    expect(parseAppHash("#review")).toBe("review");
    expect(parseAppHash("#nope")).toBe("review");
  });
});
