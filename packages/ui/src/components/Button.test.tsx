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

  it("buttonClassName includes primary app styles by default", () => {
    expect(buttonClassName()).toContain("bg-opt-accent");
    expect(buttonClassName({ surface: "overlay", variant: "secondary" })).toContain("bg-gr-bg");
  });
});
