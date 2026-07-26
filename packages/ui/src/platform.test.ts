import { afterEach, describe, expect, it, vi } from "vitest";
import { isMacPlatform } from "./platform";

function mockNavigator(partial: {
  platform?: string;
  userAgent?: string;
  userAgentData?: { platform?: string };
}) {
  vi.stubGlobal("navigator", {
    platform: partial.platform ?? "",
    userAgent: partial.userAgent ?? "",
    userAgentData: partial.userAgentData,
  });
}

describe("isMacPlatform", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("detects macOS from navigator.platform", () => {
    mockNavigator({ platform: "MacIntel" });
    expect(isMacPlatform()).toBe(true);
  });

  it("detects macOS from userAgentData.platform", () => {
    mockNavigator({ platform: "Win32", userAgentData: { platform: "macOS" } });
    expect(isMacPlatform()).toBe(true);
  });

  it("detects macOS from userAgent fallback", () => {
    mockNavigator({
      platform: "",
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    });
    expect(isMacPlatform()).toBe(true);
  });

  it("returns false for Windows", () => {
    mockNavigator({ platform: "Win32", userAgent: "Windows NT 10.0" });
    expect(isMacPlatform()).toBe(false);
  });

  it("returns false for Linux", () => {
    mockNavigator({ platform: "Linux x86_64", userAgent: "X11; Linux x86_64" });
    expect(isMacPlatform()).toBe(false);
  });
});
