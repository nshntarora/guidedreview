import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultModelFor } from "@guided-review/core";
import { resetConfirmationQueueForTests } from "@extension/lib/confirmation";
import { Settings } from "./Settings";
import { SettingsApp } from "./SettingsApp";
import type { PublicAgent, PublicSettings } from "./types";

const settings: PublicSettings = {
  provider: "openai",
  model: "gpt-4.1",
  hasKey: true,
  last4: "key1",
  codingAgent: null,
  configPath: "/tmp/guided-review/config.json",
};

const agents: PublicAgent[] = [
  {
    id: "claude-code",
    displayName: "Claude Code",
    provider: "anthropic",
    installed: false,
    usable: false,
    reason: "Claude Code is not installed.",
  },
  {
    id: "codex",
    displayName: "Codex",
    provider: "openai",
    installed: true,
    usable: true,
    reason: null,
  },
  {
    id: "grok",
    displayName: "Grok",
    provider: "grok",
    installed: false,
    usable: false,
    reason: "Grok is not installed.",
  },
];

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function mockFetch(handlers: {
  settings?: PublicSettings;
  agents?: PublicAgent[];
  put?: (body: unknown) => PublicSettings | { error: string };
  putStatus?: number;
  test?: { ok: boolean; error?: string };
  testStatus?: number;
}) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = (init?.method ?? "GET").toUpperCase();
    if (url.includes("/api/agents") && method === "GET") {
      return jsonResponse({ agents: handlers.agents ?? agents });
    }
    if (url.includes("/api/settings/test") && method === "POST") {
      return jsonResponse(handlers.test ?? { ok: true }, handlers.testStatus ?? 200);
    }
    if (url.includes("/api/settings") && method === "PUT") {
      const body = init?.body ? JSON.parse(String(init.body)) : {};
      const next = handlers.put?.(body) ?? { ...settings, ...body, hasKey: true };
      return jsonResponse(next, handlers.putStatus ?? 200);
    }
    if (url.includes("/api/settings") && method === "GET") {
      return jsonResponse(handlers.settings ?? settings);
    }
    return jsonResponse({ error: `unhandled ${method} ${url}` }, 404);
  });
}

async function chooseOption(
  user: ReturnType<typeof userEvent.setup>,
  label: RegExp | string,
  optionName: string | RegExp,
) {
  await user.click(screen.getByRole("combobox", { name: label }));
  const listbox = screen.getByRole("listbox");
  await user.click(within(listbox).getByRole("option", { name: optionName }));
}

describe("Settings", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch({}));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    window.location.hash = "";
    document.title = "";
  });

  it("hydrates the form from the server", async () => {
    render(<Settings token="secret" />);

    expect(await screen.findByRole("combobox", { name: /provider/i })).toHaveTextContent("OpenAI");
    expect(screen.getByRole("combobox", { name: /model/i })).toHaveTextContent("GPT-4.1");
    expect(screen.getByLabelText(/api key/i)).toHaveAttribute(
      "placeholder",
      expect.stringContaining("key1"),
    );
    expect(screen.getByRole("switch", { name: /use my subscription/i })).toHaveAttribute(
      "aria-checked",
      "false",
    );
    expect(screen.getByText("/tmp/guided-review/config.json")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "How it works" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "If it fails" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "How it works" }).closest("details"),
    ).not.toHaveAttribute("open");
    expect(
      screen.getByRole("heading", { name: "If it fails" }).closest("details"),
    ).not.toHaveAttribute("open");
  });

  it("expands If it fails to show subscription troubleshooting", async () => {
    const user = userEvent.setup();
    render(<Settings token="secret" />);
    await screen.findByRole("combobox", { name: /provider/i });

    const fails = screen.getByRole("heading", { name: "If it fails" });
    expect(screen.getByText(/Confirm the matching CLI is installed/i)).not.toBeVisible();

    await user.click(fails);
    expect(fails.closest("details")).toHaveAttribute("open");
    expect(screen.getByText(/Confirm the matching CLI is installed/i)).toBeVisible();
    expect(screen.getByText("claude")).toBeVisible();
    expect(screen.getByText("codex")).toBeVisible();
    expect(screen.getByText("grok")).toBeVisible();
  });

  it("hydrates a subscription as the toggle on and hides the key field", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch({
        settings: { ...settings, codingAgent: "codex", last4: "cret" },
      }),
    );
    render(<Settings token="secret" />);

    const toggle = await screen.findByRole("switch", { name: /use my subscription/i });
    expect(toggle).toHaveAttribute("aria-checked", "true");
    expect(screen.queryByLabelText(/api key/i)).not.toBeInTheDocument();
    expect(screen.getByTestId("subscription-status")).toHaveTextContent("Codex is signed in.");
  });

  it("resets the model to the provider default when the provider changes", async () => {
    const user = userEvent.setup();
    render(<Settings token="secret" />);
    await screen.findByRole("combobox", { name: /provider/i });
    await chooseOption(user, /provider/i, /Grok/);
    expect(screen.getByRole("combobox", { name: /model/i })).toHaveTextContent("Grok 4");
  });

  it("saves on-screen settings and shows Saved", async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    const fetchMock = mockFetch({
      put: (body) => ({
        ...settings,
        ...(body as Partial<PublicSettings>),
        hasKey: true,
        last4: "wkey",
        codingAgent: null,
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<Settings token="secret" onSaved={onSaved} />);

    await screen.findByRole("combobox", { name: /provider/i });
    await user.type(screen.getByLabelText(/api key/i), "sk-new-key");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Saved")).toBeInTheDocument();
    const put = fetchMock.mock.calls.find(
      (call) => String(call[0]).includes("/api/settings") && call[1]?.method === "PUT",
    );
    expect(put).toBeDefined();
    expect(JSON.parse(String(put?.[1]?.body))).toMatchObject({
      provider: "openai",
      model: defaultModelFor("openai"),
      apiKey: "sk-new-key",
      codingAgent: null,
    });
    expect(onSaved).toHaveBeenCalled();
  });

  it("saves a subscription without sending a key", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetch({
      put: (body) => ({
        ...settings,
        codingAgent: (body as { codingAgent?: string | null }).codingAgent ?? "codex",
        last4: "cret",
        hasKey: true,
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<Settings token="secret" />);

    await screen.findByRole("combobox", { name: /provider/i });
    await user.click(screen.getByRole("switch", { name: /use my subscription/i }));
    expect(screen.queryByLabelText(/api key/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Saved")).toBeInTheDocument();
    const put = fetchMock.mock.calls.find(
      (call) => String(call[0]).includes("/api/settings") && call[1]?.method === "PUT",
    );
    expect(JSON.parse(String(put?.[1]?.body))).toEqual({
      provider: "openai",
      model: defaultModelFor("openai"),
      codingAgent: "codex",
    });
  });

  it("shows an error when save fails", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      mockFetch({
        put: () => ({ error: "Disk full" }),
        putStatus: 500,
      }),
    );
    render(<Settings token="secret" />);
    await screen.findByRole("combobox", { name: /provider/i });
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("Error: Disk full")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).not.toBeDisabled();
  });

  it("disables Test connection until a key is present", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch({
        settings: { ...settings, hasKey: false, last4: null },
      }),
    );
    render(<Settings token="secret" />);
    await screen.findByRole("combobox", { name: /provider/i });
    expect(screen.getByRole("button", { name: /test connection/i })).toBeDisabled();
  });

  it("shows a success status when the connection test succeeds", async () => {
    const user = userEvent.setup();
    render(<Settings token="secret" />);
    await screen.findByRole("combobox", { name: /provider/i });
    await user.click(screen.getByRole("button", { name: /test connection/i }));
    await waitFor(() => expect(screen.getByText("Connection OK")).toBeInTheDocument());
  });

  it("shows the error message when the connection test fails", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      mockFetch({
        test: { ok: false, error: "Invalid API key" },
      }),
    );
    render(<Settings token="secret" />);
    await screen.findByRole("combobox", { name: /provider/i });
    await user.click(screen.getByRole("button", { name: /test connection/i }));
    await waitFor(() => expect(screen.getByText("Error: Invalid API key")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: /test connection/i })).not.toBeDisabled();
  });

  it("does not repeat the subscription error after a failed connection test", async () => {
    const user = userEvent.setup();
    const reason =
      "Claude Code login expired. Run claude to sign in again, or set ANTHROPIC_API_KEY.";
    vi.stubGlobal(
      "fetch",
      mockFetch({
        settings: {
          ...settings,
          provider: "anthropic",
          model: defaultModelFor("anthropic"),
          codingAgent: "claude-code",
          hasKey: true,
          last4: "key1",
        },
        agents: agents.map((agent) => (agent.id === "claude-code" ? { ...agent, reason } : agent)),
        test: { ok: false, error: reason },
      }),
    );
    render(<Settings token="secret" />);

    expect(await screen.findByTestId("subscription-status")).toHaveTextContent(reason);
    await user.click(screen.getByRole("button", { name: /test connection/i }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /test connection/i })).not.toBeDisabled(),
    );

    expect(screen.getByTestId("subscription-status")).toHaveTextContent(reason);
    expect(screen.queryByText(`Error: ${reason}`)).not.toBeInTheDocument();
    expect(screen.getAllByText(reason)).toHaveLength(1);
  });
});

describe("SettingsApp", () => {
  beforeEach(() => {
    act(() => {
      resetConfirmationQueueForTests();
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    window.location.hash = "";
    document.title = "";
    act(() => {
      resetConfirmationQueueForTests();
    });
  });

  it("opens as a modal with about, docs, and a close control", async () => {
    vi.stubGlobal("fetch", mockFetch({}));
    render(<SettingsApp token="secret" route="settings" onClose={vi.fn()} />);

    expect(await screen.findByRole("dialog", { name: "Settings" })).toBeInTheDocument();
    expect(await screen.findByRole("combobox", { name: /provider/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "About" })).toHaveAttribute("href", "#about");
    expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "About" })).not.toHaveAttribute("aria-current");
    expect(screen.queryByRole("link", { name: "Review" })).not.toBeInTheDocument();
    const docs = screen.getByRole("link", { name: "Docs" });
    expect(docs).toHaveAttribute("href", "https://guidedreview.dev/docs");
    expect(docs).toHaveAttribute("target", "_blank");
    const close = screen.getByTestId("settings-close");
    expect(close).toHaveTextContent("Close");
    expect(close).toHaveTextContent("Esc");
    expect(close.querySelector("svg")).toBeInTheDocument();
    expect(document.title).toBe("Guided Review — Settings");
  });

  it("shows the about view when the route is about", async () => {
    vi.stubGlobal("fetch", mockFetch({}));
    render(<SettingsApp token="secret" route="about" onClose={vi.fn()} />);

    expect(await screen.findByRole("heading", { name: "How it works" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Chrome extension" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Chrome extension" })).toHaveAttribute(
      "href",
      "https://chromewebstore.google.com/detail/pdnnimoajmnjpccboemeomoeomancodd",
    );
    expect(screen.queryByRole("combobox", { name: /provider/i })).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "About" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "About" })).toHaveAttribute("aria-current", "page");
    expect(document.title).toBe("Guided Review — About");
  });

  it("closes from the header button and Escape when nothing has changed", async () => {
    vi.stubGlobal("fetch", mockFetch({}));
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { rerender } = render(<SettingsApp token="secret" route="settings" onClose={onClose} />);

    await screen.findByRole("combobox", { name: /provider/i });
    await user.click(screen.getByTestId("settings-close"));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("confirmation-dialog")).not.toBeInTheDocument();

    rerender(<SettingsApp token="secret" route="settings" onClose={onClose} />);
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("keeps settings open on ⌘/Ctrl+, and jumps there from about", async () => {
    vi.stubGlobal("fetch", mockFetch({}));
    window.location.hash = "settings";
    const onClose = vi.fn();
    const { rerender } = render(<SettingsApp token="secret" route="settings" onClose={onClose} />);

    await screen.findByRole("combobox", { name: /provider/i });
    fireEvent.keyDown(window, { key: ",", metaKey: true });
    expect(onClose).not.toHaveBeenCalled();
    expect(window.location.hash).toBe("#settings");

    rerender(<SettingsApp token="secret" route="about" onClose={onClose} />);
    window.location.hash = "about";
    fireEvent.keyDown(window, { key: ",", metaKey: true });
    expect(onClose).not.toHaveBeenCalled();
    expect(window.location.hash).toBe("#settings");
  });

  it("asks before closing when settings have unsaved changes", async () => {
    vi.stubGlobal("fetch", mockFetch({}));
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<SettingsApp token="secret" route="settings" onClose={onClose} />);

    await screen.findByRole("combobox", { name: /provider/i });
    await user.type(screen.getByLabelText(/api key/i), "sk-new");
    await user.click(screen.getByTestId("settings-close"));

    expect(await screen.findByTestId("confirmation-dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Discard unsaved settings?" })).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();

    await user.click(screen.getByTestId("confirmation-cancel"));
    await waitFor(() =>
      expect(screen.queryByTestId("confirmation-dialog")).not.toBeInTheDocument(),
    );
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "Settings" })).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(await screen.findByTestId("confirmation-dialog")).toBeInTheDocument();
    await user.click(screen.getByTestId("confirmation-ok"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
