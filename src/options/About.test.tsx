import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { About } from "./About";

describe("About", () => {
  it("explains what the extension does and how a review works", () => {
    render(<About />);

    expect(screen.getByRole("heading", { name: "Guided Review" })).toBeInTheDocument();
    expect(screen.getByText(/v0\.1\.0/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "What it does" })).toBeInTheDocument();
    expect(
      screen.getByText(/turns a GitHub pull request diff into an ordered, AI-guided review/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "How a review works" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Privacy" })).toBeInTheDocument();
    expect(screen.getByText(/no Guided Review backend/i)).toBeInTheDocument();
  });

  it("links back to settings via hash", () => {
    render(<About />);

    const link = screen.getByRole("link", { name: /settings/i });
    expect(link).toHaveAttribute("href", "#settings");
  });
});
