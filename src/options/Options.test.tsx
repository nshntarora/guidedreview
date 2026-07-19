import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Options } from "./Options";

describe("Options", () => {
  it("hydrates the form from stored settings", async () => {
    await chrome.storage.local.set({
      "guidedReview.providerSettings": { provider: "openai", model: "gpt-4.1", apiKey: "sk-existing" },
    });

    render(<Options />);

    expect(await screen.findByDisplayValue("gpt-4.1")).toBeInTheDocument();
    expect(screen.getByLabelText(/provider/i)).toHaveValue("openai");
    expect(screen.getByLabelText(/api key/i)).toHaveValue("sk-existing");
  });

  it("falls back to anthropic defaults when nothing is stored", async () => {
    render(<Options />);

    expect(await screen.findByLabelText(/provider/i)).toHaveValue("anthropic");
    expect(screen.getByLabelText(/model/i)).toHaveValue("claude-opus-4-8");
    expect(screen.getByLabelText(/api key/i)).toHaveValue("");
  });

  it("resets the model to the provider default when the provider changes", async () => {
    const user = userEvent.setup();
    render(<Options />);

    await screen.findByLabelText(/provider/i);
    await user.selectOptions(screen.getByLabelText(/provider/i), "grok");

    expect(screen.getByLabelText(/model/i)).toHaveValue("grok-4");
  });

  it("saves the on-screen settings to chrome.storage.local and shows Saved", async () => {
    const user = userEvent.setup();
    render(<Options />);

    await screen.findByLabelText(/provider/i);
    await user.type(screen.getByLabelText(/api key/i), "sk-new-key");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByText("Saved")).toBeInTheDocument();
    const stored = await chrome.storage.local.get("guidedReview.providerSettings");
    expect(stored["guidedReview.providerSettings"]).toEqual({
      provider: "anthropic",
      model: "claude-opus-4-8",
      apiKey: "sk-new-key",
    });
  });

  it("disables Test connection until an API key is present", async () => {
    render(<Options />);
    await screen.findByLabelText(/provider/i);
    expect(screen.getByRole("button", { name: /test connection/i })).toBeDisabled();
  });

  it("shows a success status when the connection test succeeds", async () => {
    const user = userEvent.setup();
    vi.mocked(chrome.runtime.sendMessage).mockResolvedValueOnce({ ok: true });
    render(<Options />);

    await screen.findByLabelText(/provider/i);
    await user.type(screen.getByLabelText(/api key/i), "sk-test");
    await user.click(screen.getByRole("button", { name: /test connection/i }));

    await waitFor(() => expect(screen.getByText("Connection works")).toBeInTheDocument());
  });

  it("shows the error message when the connection test fails", async () => {
    const user = userEvent.setup();
    vi.mocked(chrome.runtime.sendMessage).mockResolvedValueOnce({ ok: false, error: "Invalid API key" });
    render(<Options />);

    await screen.findByLabelText(/provider/i);
    await user.type(screen.getByLabelText(/api key/i), "sk-bad");
    await user.click(screen.getByRole("button", { name: /test connection/i }));

    await waitFor(() => expect(screen.getByText("Invalid API key")).toBeInTheDocument());
  });

  it("shows an error when the connection test throws", async () => {
    const user = userEvent.setup();
    vi.mocked(chrome.runtime.sendMessage).mockRejectedValueOnce(new Error("Extension context invalidated"));
    render(<Options />);

    await screen.findByLabelText(/provider/i);
    await user.type(screen.getByLabelText(/api key/i), "sk-test");
    await user.click(screen.getByRole("button", { name: /test connection/i }));

    await waitFor(() =>
      expect(screen.getByText("Extension context invalidated")).toBeInTheDocument(),
    );
    // Must not remain stuck on "Testing…"
    expect(screen.getByRole("button", { name: /test connection/i })).not.toBeDisabled();
  });
});
