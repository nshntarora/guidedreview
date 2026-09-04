import { describe, expect, it } from "vitest";
import { imageMimeType, isImagePath } from "./image";

describe("isImagePath / imageMimeType", () => {
  it("recognizes common image extensions regardless of case or directory", () => {
    expect(isImagePath("logo.png")).toBe(true);
    expect(isImagePath("assets/ICON.SVG")).toBe(true);
    expect(isImagePath("a/b/photo.JPEG")).toBe(true);
    expect(imageMimeType("icons/mark.svg")).toBe("image/svg+xml");
    expect(imageMimeType("x.webp")).toBe("image/webp");
  });

  it("rejects non-image paths and dotfiles without a real extension", () => {
    expect(isImagePath("src/foo.ts")).toBe(false);
    expect(isImagePath("Makefile")).toBe(false);
    expect(isImagePath(".png")).toBe(false);
    expect(isImagePath("archive.tar.gz")).toBe(false);
    expect(imageMimeType("readme.md")).toBeUndefined();
  });
});
