import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Options } from "./Options";
import { defaultModelFor } from "../lib/providers/catalog";

async function chooseOption(
  user: ReturnType<typeof userEvent.setup>,
  label: RegExp | string,
  optionName: string | RegExp,
) {
  await user.click(screen.getByRole("combobox", { name: label }));
  const listbox = screen.getByRole("listbox");
  await user.click(within(listbox).getByRole("option", { name: optionName }));
}

describe("Options", () => {
  it("hydrates the form from stored settings", async () => {
    await chrome.storage.local.set({
      "guidedReview.providerSettings": {
        provider: "openai",
        model: "gpt-4.1",
        apiKey: "sk-existing",
      },
    });

    render(<Options />);

    expect(await screen.findByRole("combobox", { name: /provider/i })).toHaveTextContent("OpenAI");
    expect(screen.getByRole("combobox", { name: /model/i })).toHaveTextContent("GPT-4.1");
    expect(screen.getByLabelText(/api key/i)).toHaveValue("sk-existing");
  });

  it("falls back to anthropic defaults when nothing is stored", async () => {
    render(<Options />);

    expect(await screen.findByRole("combobox", { name: /provider/i })).toHaveTextContent(
      "Claude (Anthropic)",
    );
    expect(screen.getByRole("combobox", { name: /model/i })).toHaveTextContent("Claude Opus 4.8");
    expect(screen.getByLabelText(/api key/i)).toHaveValue("");
  });

  it("resets the model to the provider default when the provider changes", async () => {
    const user = userEvent.setup();
    render(<Options />);

    await screen.findByRole("combobox", { name: /provider/i });
    await chooseOption(user, /provider/i, /Grok/);

    expect(screen.getByRole("combobox", { name: /model/i })).toHaveTextContent("Grok 4");
  });

  it("saves the on-screen settings to chrome.storage.local and shows Saved", async () => {
    const user = userEvent.setup();
    render(<Options />);

    await screen.findByRole("combobox", { name: /provider/i });
    await user.type(screen.getByLabelText(/api key/i), "sk-new-key");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Saved")).toBeInTheDocument();
    const stored = await chrome.storage.local.get("guidedReview.providerSettings");
    expect(stored["guidedReview.providerSettings"]).toEqual({
      provider: "anthropic",
      model: defaultModelFor("anthropic"),
      apiKey: "sk-new-key",
    });
  });

  it("shows an error when save fails", async () => {
    const user = userEvent.setup();
    vi.spyOn(chrome.storage.local, "set").mockRejectedValueOnce(new Error("Quota exceeded"));
    render(<Options />);

    await screen.findByRole("combobox", { name: /provider/i });
    await user.type(screen.getByLabelText(/api key/i), "sk-x");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Error: Quota exceeded")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).not.toBeDisabled();
  });

  it("disables Test connection until an API key is present", async () => {
    render(<Options />);
    await screen.findByRole("combobox", { name: /provider/i });
    expect(screen.getByRole("button", { name: /test connection/i })).toBeDisabled();
  });

  it("shows a success status when the connection test succeeds", async () => {
    const user = userEvent.setup();
    // GitHubAuthSection also messages on mount (GITHUB_AUTH_GET); route by type.
    vi.mocked(chrome.runtime.sendMessage).mockImplementation(async (message) => {
      const type =
        message && typeof message === "object" && "type" in message
          ? (message as { type: string }).type
          : "";
      if (type === "GITHUB_AUTH_GET") return { ok: true, auth: null };
      if (type === "TEST_CONNECTION") return { ok: true };
      return undefined;
    });
    render(<Options />);

    await screen.findByRole("combobox", { name: /provider/i });
    await user.type(screen.getByLabelText(/api key/i), "sk-test");
    await user.click(screen.getByRole("button", { name: /test connection/i }));

    await waitFor(() => expect(screen.getByText("Connection OK")).toBeInTheDocument());
  });

  it("shows the error message when the connection test fails", async () => {
    const user = userEvent.setup();
    vi.mocked(chrome.runtime.sendMessage).mockImplementation(async (message) => {
      const type =
        message && typeof message === "object" && "type" in message
          ? (message as { type: string }).type
          : "";
      if (type === "GITHUB_AUTH_GET") return { ok: true, auth: null };
      if (type === "TEST_CONNECTION") return { ok: false, error: "Invalid API key" };
      return undefined;
    });
    render(<Options />);

    await screen.findByRole("combobox", { name: /provider/i });
    await user.type(screen.getByLabelText(/api key/i), "sk-bad");
    await user.click(screen.getByRole("button", { name: /test connection/i }));

    await waitFor(() => expect(screen.getByText("Error: Invalid API key")).toBeInTheDocument());
  });

  it("shows an error when the connection test throws", async () => {
    const user = userEvent.setup();
    vi.mocked(chrome.runtime.sendMessage).mockImplementation(async (message) => {
      const type =
        message && typeof message === "object" && "type" in message
          ? (message as { type: string }).type
          : "";
      if (type === "GITHUB_AUTH_GET") return { ok: true, auth: null };
      if (type === "TEST_CONNECTION") {
        throw new Error("Extension context invalidated");
      }
      return undefined;
    });
    render(<Options />);

    await screen.findByRole("combobox", { name: /provider/i });
    await user.type(screen.getByLabelText(/api key/i), "sk-test");
    await user.click(screen.getByRole("button", { name: /test connection/i }));

    await waitFor(() =>
      expect(screen.getByText("Error: Extension context invalidated")).toBeInTheDocument(),
    );
    // Must not remain stuck on "Testing…"
    expect(screen.getByRole("button", { name: /test connection/i })).not.toBeDisabled();
  });

  it("lists expanded model options for the selected provider", async () => {
    const user = userEvent.setup();
    render(<Options />);

    await screen.findByRole("combobox", { name: /model/i });
    await user.click(screen.getByRole("combobox", { name: /model/i }));

    const listbox = screen.getByRole("listbox");
    expect(within(listbox).getByRole("option", { name: /Claude Sonnet 5/i })).toBeInTheDocument();
    expect(within(listbox).getByRole("option", { name: /Claude Haiku 4\.5/i })).toBeInTheDocument();
  });

  it("links to about and docs via the shell nav when rendered in App", async () => {
    // About/Docs nav lives in OptionsShell (App); Options alone is the settings body.
    const { App } = await import("./App");
    render(<App />);

    await screen.findByRole("combobox", { name: /provider/i });
    expect(screen.getByRole("link", { name: "About" })).toHaveAttribute("href", "#about");
    const docs = screen.getByRole("link", { name: "Docs" });
    expect(docs).toHaveAttribute("href", "https://guidedreview.dev/docs");
    expect(docs).toHaveAttribute("target", "_blank");
  });

  it("defaults the Files changed auto-open switch to off", async () => {
    render(<Options />);

    const toggle = await screen.findByRole("switch", {
      name: /automatically open on files changed/i,
    });
    expect(toggle).toHaveAttribute("aria-checked", "false");
  });

  it("hydrates and persists the Files changed auto-open preference", async () => {
    const user = userEvent.setup();
    await chrome.storage.local.set({ "guidedReview.autoOpenOnFilesTab": true });

    render(<Options />);

    const toggle = await screen.findByRole("switch", {
      name: /automatically open on files changed/i,
    });
    expect(toggle).toHaveAttribute("aria-checked", "true");

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-checked", "false");

    await waitFor(async () => {
      const stored = await chrome.storage.local.get("guidedReview.autoOpenOnFilesTab");
      expect(stored["guidedReview.autoOpenOnFilesTab"]).toBe(false);
    });
  });
});
