import { afterEach, describe, expect, it, vi } from "vitest";
import { modKeyLabel } from "./platform";

describe("modKeyLabel", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function mockPlatform(platform: string) {
    vi.stubGlobal("navigator", { platform, userAgent: "", userAgentData: undefined });
  }

  it("returns ⌘ on macOS", () => {
    mockPlatform("MacIntel");
    expect(modKeyLabel()).toBe("⌘");
  });

  it("returns Ctrl on non-macOS", () => {
    mockPlatform("Win32");
    expect(modKeyLabel()).toBe("Ctrl");
  });
});
