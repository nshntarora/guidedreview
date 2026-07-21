import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Textarea } from "./Textarea";

describe("Textarea", () => {
  it("renders a textbox", () => {
    render(<Textarea aria-label="Comment" />);
    expect(screen.getByRole("textbox", { name: "Comment" })).toBeTruthy();
  });
});
