import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "./App";

afterEach(() => {
  window.location.hash = "";
  document.title = "";
});

describe("App", () => {
  it("shows settings by default", async () => {
    render(<App />);

    expect(await screen.findByRole("combobox", { name: /provider/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "About" })).toHaveAttribute("href", "#about");
    expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "About" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: "Docs" })).toHaveAttribute(
      "href",
      "https://guidedreview.dev/docs",
    );
    expect(document.title).toBe("Guided Review — Settings");
  });

  it("shows the about page when the hash is #about", async () => {
    window.location.hash = "#about";
    render(<App />);

    expect(await screen.findByRole("heading", { name: "How it works" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Local review" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "CLI" })).toHaveAttribute(
      "href",
      "https://guidedreview.dev/docs/local-review",
    );
    expect(screen.queryByRole("combobox", { name: /provider/i })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "About" })).toHaveAttribute("aria-current", "page");
    expect(document.title).toBe("Guided Review — About");
  });

  it("navigates between settings and about via hash links", async () => {
    const user = userEvent.setup();
    render(<App />);

    await screen.findByRole("combobox", { name: /provider/i });
    await user.click(screen.getByRole("link", { name: "About" }));

    expect(await screen.findByRole("heading", { name: "How it works" })).toBeInTheDocument();
    await waitFor(() => expect(window.location.hash).toBe("#about"));

    await user.click(screen.getByRole("link", { name: "Settings" }));
    expect(await screen.findByRole("combobox", { name: /provider/i })).toBeInTheDocument();
    await waitFor(() => expect(window.location.hash).toBe("#settings"));
  });
});
