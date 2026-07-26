import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { About } from "./About";
import { OptionsShell } from "./OptionsShell";

describe("About", () => {
  it("explains what the extension does and how a review works", () => {
    render(
      <OptionsShell route="about">
        <About />
      </OptionsShell>,
    );

    expect(screen.getByRole("heading", { name: "About" })).toBeInTheDocument();
    expect(screen.getByText(/v0\.1\.0/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "What It Does" })).toBeInTheDocument();
    expect(screen.getByText(/turns a PR diff into an ordered review plan/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "How a Review Works" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Privacy" })).toBeInTheDocument();
    expect(screen.getByText(/no Guided Review backend/i)).toBeInTheDocument();
    const privacyPolicy = screen.getByRole("link", { name: /privacy policy/i });
    expect(privacyPolicy).toHaveAttribute("href", "https://guidedreview.dev/privacy");
  });

  it("links back to settings via the shell nav", () => {
    render(
      <OptionsShell route="about">
        <About />
      </OptionsShell>,
    );

    const link = screen.getByRole("link", { name: "Settings" });
    expect(link).toHaveAttribute("href", "#settings");
  });
});
