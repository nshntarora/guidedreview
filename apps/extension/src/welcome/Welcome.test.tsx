import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Welcome } from "./Welcome";

describe("Welcome", () => {
  it("shows the three setup steps and helpful links", async () => {
    render(<Welcome />);

    expect(screen.getByRole("heading", { name: "Welcome" })).toBeInTheDocument();
    expect(screen.getByText(/Here's how to get started/i)).toBeInTheDocument();
    expect(screen.queryByText(/Extension installed/i)).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Pin the extension" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Connect an AI provider" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Start a review on a PR" })).toBeInTheDocument();

    const productLinks = screen.getByRole("navigation", { name: "Product links" });
    expect(productLinks).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Website" })).toHaveAttribute(
      "href",
      "https://guidedreview.dev",
    );
    expect(screen.getByRole("link", { name: "Docs" })).toHaveAttribute(
      "href",
      "https://guidedreview.dev/docs",
    );
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
    expect(screen.getByRole("link", { name: /Open GitHub pull requests/i })).toHaveAttribute(
      "href",
      "https://github.com/pulls",
    );

    await waitFor(() => {
      expect(screen.getByText(/puzzle-piece menu/i)).toBeInTheDocument();
    });
  });

  it("opens options when Connect AI provider is clicked", async () => {
    const user = userEvent.setup();
    render(<Welcome />);

    await user.click(screen.getByRole("button", { name: /Connect AI provider/i }));

    expect(chrome.runtime.openOptionsPage).toHaveBeenCalledTimes(1);
  });

  it("shows pinned status when the extension is on the toolbar", async () => {
    vi.mocked(chrome.action.getUserSettings).mockResolvedValueOnce({ isOnToolbar: true });

    render(<Welcome />);

    expect(await screen.findByText(/Pinned to the toolbar/i)).toBeInTheDocument();
  });
});
