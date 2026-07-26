import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button, buttonClassName } from "./Button";

describe("Button", () => {
  it("renders a button with children", () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole("button", { name: "Save" })).toBeTruthy();
  });

  it("defaults type to button", () => {
    render(<Button>Go</Button>);
    expect(screen.getByRole("button")).toHaveProperty("type", "button");
  });

  it("forwards disabled", () => {
    render(<Button disabled>Busy</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("buttonClassName includes primary styles by default", () => {
    expect(buttonClassName()).toContain("bg-primary");
    expect(buttonClassName({ variant: "secondary" })).toContain("bg-surface-raised");
  });

  it("uses not-disabled:hover so hover works on anchors and enabled buttons", () => {
    // `:enabled` only matches form controls — link-styled CTAs would never hover.
    const primary = buttonClassName();
    expect(primary).toContain("not-disabled:hover:bg-primary-hover");
    expect(primary).not.toContain("enabled:hover:");
  });

  it("includes transition-colors for hover feedback", () => {
    expect(buttonClassName()).toContain("transition-colors");
  });
});
