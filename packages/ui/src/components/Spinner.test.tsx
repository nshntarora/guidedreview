import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Spinner } from "./Spinner";

describe("Spinner", () => {
  it("renders with accessible label", () => {
    render(<Spinner label="Working" />);
    expect(screen.getByRole("status", { name: "Working" })).toBeTruthy();
  });

  it("defaults label to Loading", () => {
    render(<Spinner />);
    expect(screen.getByRole("status", { name: "Loading" })).toBeTruthy();
  });

  it("applies size via style", () => {
    render(<Spinner size={32} />);
    const el = screen.getByRole("status");
    expect(el.style.width).toBe("32px");
    expect(el.style.height).toBe("32px");
  });
});
