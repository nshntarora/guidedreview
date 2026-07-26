import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { About } from "./About";
import { OptionsShell } from "./OptionsShell";

describe("About", () => {
  it("shows a minimal product overview with logomark, how it works, and privacy", () => {
    render(
      <OptionsShell route="about">
        <About />
      </OptionsShell>,
    );

    expect(screen.getByRole("heading", { name: "Guided Review" })).toBeInTheDocument();
    expect(screen.getByText(/v0\.1\.0/)).toBeInTheDocument();
    expect(screen.getByText(/makes reading code better/i)).toBeInTheDocument();
    expect(screen.getByText(/Free · Open source · Bring your own LLM key/)).toBeInTheDocument();

    expect(screen.getByRole("heading", { name: "How it works" })).toBeInTheDocument();
    expect(screen.getByText(/Start Guided Review/i)).toBeInTheDocument();
    expect(screen.getByText(/clusters related changes/i)).toBeInTheDocument();

    expect(screen.getByRole("heading", { name: "Privacy" })).toBeInTheDocument();
    expect(screen.getByText(/never touches our infrastructure/i)).toBeInTheDocument();
  });

  it("links out to website, docs, github, privacy, and terms", () => {
    render(
      <OptionsShell route="about">
        <About />
      </OptionsShell>,
    );

    const productLinks = screen.getByRole("navigation", { name: "Product links" });

    expect(screen.getByRole("link", { name: "Website" })).toHaveAttribute(
      "href",
      "https://guidedreview.dev",
    );
    // Docs appears in the shell nav and the product links footer.
    expect(
      screen
        .getAllByRole("link", { name: "Docs" })
        .every((el) => el.getAttribute("href") === "https://guidedreview.dev/docs"),
    ).toBe(true);
    expect(screen.getByRole("link", { name: "GitHub" })).toHaveAttribute(
      "href",
      "https://github.com/nshntarora/guidedreview",
    );
    expect(screen.getByRole("link", { name: "Privacy" })).toHaveAttribute(
      "href",
      "https://guidedreview.dev/privacy",
    );
    expect(screen.getByRole("link", { name: "Terms" })).toHaveAttribute(
      "href",
      "https://guidedreview.dev/terms",
    );
    expect(productLinks).toBeInTheDocument();
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
