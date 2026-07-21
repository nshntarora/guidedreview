import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Input } from "./Input";

describe("Input", () => {
  it("renders an input with accessible name via aria-label", () => {
    render(<Input aria-label="API Key" />);
    expect(screen.getByRole("textbox", { name: "API Key" })).toBeTruthy();
  });

  it("supports password type", () => {
    render(<Input type="password" aria-label="Secret" />);
    expect(screen.getByLabelText("Secret")).toHaveAttribute("type", "password");
  });
});
