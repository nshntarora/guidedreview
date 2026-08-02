import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Welcome } from "./Welcome";

describe("Welcome", () => {
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
