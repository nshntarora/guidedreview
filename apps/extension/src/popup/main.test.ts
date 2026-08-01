import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * popup/main.ts calls init() at import time. Each case resets modules and
 * rebuilds the popup DOM before a fresh dynamic import.
 */

function mountPopupDom(): {
  root: HTMLElement;
  message: HTMLElement;
  settings: HTMLAnchorElement;
  about: HTMLAnchorElement;
} {
  document.body.innerHTML = `
    <div id="root" class="popup" hidden>
      <div class="popup__mark" aria-hidden="true"></div>
      <p id="message" class="popup__message"></p>
      <nav class="popup__links" aria-label="Extension pages">
        <a id="settings" class="popup__link" href="#">Settings</a>
        <a id="about" class="popup__link" href="#">About</a>
      </nav>
    </div>
  `;
  return {
    root: document.getElementById("root") as HTMLElement,
    message: document.getElementById("message") as HTMLElement,
    settings: document.getElementById("settings") as HTMLAnchorElement,
    about: document.getElementById("about") as HTMLAnchorElement,
  };
}

async function loadPopup(): Promise<void> {
  await import("./main");
  // init is async; flush microtasks so DOM updates settle.
  await vi.waitFor(() => {
    // Either the popup closed (success) or the root became visible (message).
    const root = document.getElementById("root");
    if (!root) throw new Error("missing root");
    if (windowClose.mock.calls.length > 0) return true;
    if (!root.hidden) return true;
    throw new Error("popup still initializing");
  });
}

const windowClose = vi.fn();

beforeEach(() => {
  vi.resetModules();
  windowClose.mockReset();
  vi.stubGlobal("close", windowClose);
  // Also patch window.close for environments that resolve it there.
  Object.defineProperty(window, "close", { configurable: true, value: windowClose });
  mountPopupDom();
  vi.mocked(chrome.tabs.query).mockReset();
  vi.mocked(chrome.tabs.sendMessage).mockReset();
  vi.mocked(chrome.tabs.create).mockReset();
  vi.mocked(chrome.runtime.openOptionsPage).mockReset();
  vi.mocked(chrome.runtime.getURL).mockImplementation((path: string) => path);
});

afterEach(() => {
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
});

describe("popup main", () => {
  it("shows a message when the active tab is not a PR page", async () => {
    vi.mocked(chrome.tabs.query).mockResolvedValue([
      { id: 1, url: "https://github.com/acme/widgets" } as chrome.tabs.Tab,
    ]);

    await loadPopup();

    const root = document.getElementById("root")!;
    const message = document.getElementById("message")!;
    expect(root.hidden).toBe(false);
    expect(message.textContent).toMatch(/Open a GitHub pull request page/i);
    expect(chrome.tabs.sendMessage).not.toHaveBeenCalled();
    expect(windowClose).not.toHaveBeenCalled();
  });

  it("shows a message on ignored PR paths (e.g. conflicts)", async () => {
    vi.mocked(chrome.tabs.query).mockResolvedValue([
      {
        id: 2,
        url: "https://github.com/acme/widgets/pull/9/conflicts",
      } as chrome.tabs.Tab,
    ]);

    await loadPopup();

    const message = document.getElementById("message")!;
    expect(message.textContent).toMatch(/not available on this pull request page/i);
    expect(chrome.tabs.sendMessage).not.toHaveBeenCalled();
  });

  it("sends START_GUIDED_REVIEW and closes when on a PR page", async () => {
    vi.mocked(chrome.tabs.query).mockResolvedValue([
      {
        id: 7,
        url: "https://github.com/acme/widgets/pull/42/files",
      } as chrome.tabs.Tab,
    ]);
    vi.mocked(chrome.tabs.sendMessage).mockResolvedValue(undefined);

    await loadPopup();

    expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(7, { type: "START_GUIDED_REVIEW" });
    expect(windowClose).toHaveBeenCalled();
  });

  it("asks the user to reload when the content script is not reachable", async () => {
    vi.mocked(chrome.tabs.query).mockResolvedValue([
      {
        id: 3,
        url: "https://github.com/acme/widgets/pull/5",
      } as chrome.tabs.Tab,
    ]);
    vi.mocked(chrome.tabs.sendMessage).mockRejectedValue(new Error("Receiving end does not exist"));

    await loadPopup();

    const message = document.getElementById("message")!;
    expect(message.textContent).toMatch(/Reload this pull request page/i);
    expect(windowClose).not.toHaveBeenCalled();
  });

  it("opens settings via openOptionsPage", async () => {
    vi.mocked(chrome.tabs.query).mockResolvedValue([
      { id: 1, url: "https://example.com" } as chrome.tabs.Tab,
    ]);
    await loadPopup();

    document.getElementById("settings")!.click();
    expect(chrome.runtime.openOptionsPage).toHaveBeenCalledTimes(1);
  });

  it("opens About in a new tab with the #about hash", async () => {
    vi.mocked(chrome.tabs.query).mockResolvedValue([
      { id: 1, url: "https://example.com" } as chrome.tabs.Tab,
    ]);
    await loadPopup();

    document.getElementById("about")!.click();
    expect(chrome.tabs.create).toHaveBeenCalledWith({
      url: "src/options/index.html#about",
    });
  });
});
