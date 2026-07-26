import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ModEnterChord, ShortcutKeys } from "./ShortcutKeys";

function mockPlatform(platform: string) {
  vi.stubGlobal("navigator", {
    platform,
    userAgent: "",
  });
}

describe("ShortcutKeys", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders sequence keys without a + separator", () => {
    render(<ShortcutKeys keys={["v", "u"]} join="sequence" />);
    expect(screen.getByText("v")).toBeInTheDocument();
    expect(screen.getByText("u")).toBeInTheDocument();
    expect(screen.queryByText("+")).not.toBeInTheDocument();
  });

  it("renders chord keys with + between badges", () => {
    mockPlatform("Win32");
    render(<ShortcutKeys keys={["mod", "Enter"]} join="chord" />);
    expect(screen.getByText("Ctrl")).toBeInTheDocument();
    expect(screen.getByText("Enter")).toBeInTheDocument();
    expect(screen.getByText("+")).toBeInTheDocument();
  });

  it("resolves mod to ⌘ on macOS", () => {
    mockPlatform("MacIntel");
    render(<ShortcutKeys keys={["mod", "Enter"]} join="chord" />);
    expect(screen.getByText("⌘")).toBeInTheDocument();
    expect(screen.queryByText("Ctrl")).not.toBeInTheDocument();
  });

  it("resolves mod to Ctrl on non-macOS", () => {
    mockPlatform("Linux x86_64");
    render(<ShortcutKeys keys={["mod"]} join="none" />);
    expect(screen.getByText("Ctrl")).toBeInTheDocument();
    expect(screen.queryByText("⌘")).not.toBeInTheDocument();
  });

  it("renders alternatives without +", () => {
    render(<ShortcutKeys keys={["←", "→"]} join="none" />);
    expect(screen.getByText("←")).toBeInTheDocument();
    expect(screen.getByText("→")).toBeInTheDocument();
    expect(screen.queryByText("+")).not.toBeInTheDocument();
  });
});

describe("ModEnterChord", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("shows a single OS modifier with Enter", () => {
    mockPlatform("Win32");
    render(<ModEnterChord />);
    expect(screen.getByText("Ctrl")).toBeInTheDocument();
    expect(screen.getByText("Enter")).toBeInTheDocument();
    expect(screen.getByText("+")).toBeInTheDocument();
    expect(screen.queryByText("⌘")).not.toBeInTheDocument();
  });
});
