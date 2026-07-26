import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Kbd, KbdGroup } from "./Kbd";

describe("Kbd", () => {
  it("renders children inside a kbd element", () => {
    render(<Kbd>Esc</Kbd>);
    const el = screen.getByText("Esc");
    expect(el.tagName).toBe("KBD");
    expect(el).toHaveAttribute("data-slot", "kbd");
  });

  it("applies shared surface tokens", () => {
    render(<Kbd>Esc</Kbd>);
    const el = screen.getByText("Esc");
    expect(el.className).toContain("border-border");
    expect(el.className).toContain("bg-surface-muted");
    expect(el.className).toContain("text-muted");
  });

  it("merges className", () => {
    render(<Kbd className="opacity-80">A</Kbd>);
    expect(screen.getByText("A").className).toContain("opacity-80");
  });
});

describe("KbdGroup", () => {
  it("groups keys with data-slot kbd-group", () => {
    render(
      <KbdGroup data-testid="group">
        <Kbd>Ctrl</Kbd>
        <Kbd>B</Kbd>
      </KbdGroup>,
    );
    const group = screen.getByTestId("group");
    expect(group.tagName).toBe("KBD");
    expect(group).toHaveAttribute("data-slot", "kbd-group");
    expect(screen.getByText("Ctrl")).toBeInTheDocument();
    expect(screen.getByText("B")).toBeInTheDocument();
  });
});
