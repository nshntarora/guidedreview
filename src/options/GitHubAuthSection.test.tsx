import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GitHubAuthSection } from "./GitHubAuthSection";
import * as messaging from "../lib/messaging";
import * as oauthConfig from "../lib/github/oauthConfig";

vi.mock("../lib/messaging", () => ({
  getGitHubAuthStatus: vi.fn(),
  startGitHubDeviceAuth: vi.fn(),
  pollGitHubDeviceAuth: vi.fn(),
  clearGitHubAuthSession: vi.fn(),
}));

vi.mock("../lib/github/oauthConfig", () => ({
  isGitHubOAuthConfigured: vi.fn(() => true),
}));

describe("GitHubAuthSection", () => {
  beforeEach(() => {
    vi.mocked(oauthConfig.isGitHubOAuthConfigured).mockReturnValue(true);
    vi.mocked(messaging.getGitHubAuthStatus).mockResolvedValue({ ok: true, auth: null });
    vi.mocked(messaging.startGitHubDeviceAuth).mockReset();
    vi.mocked(messaging.pollGitHubDeviceAuth).mockReset();
    vi.mocked(messaging.clearGitHubAuthSession).mockReset();
    vi.useRealTimers();
  });

  it("shows a setup message when OAuth is not configured", async () => {
    vi.mocked(oauthConfig.isGitHubOAuthConfigured).mockReturnValue(false);
    render(<GitHubAuthSection />);

    expect(await screen.findByText(/isn’t configured in this build/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /connect github/i })).not.toBeInTheDocument();
  });

  it("shows Connect when disconnected", async () => {
    render(<GitHubAuthSection />);
    expect(await screen.findByRole("button", { name: /connect github/i })).toBeInTheDocument();
  });

  it("shows the connected account when auth is stored", async () => {
    vi.mocked(messaging.getGitHubAuthStatus).mockResolvedValue({
      ok: true,
      auth: {
        accessToken: "gho_x",
        tokenType: "bearer",
        scope: "repo",
        login: "octocat",
        name: "The Octocat",
      },
    });

    render(<GitHubAuthSection />);

    expect(await screen.findByText("@octocat")).toBeInTheDocument();
    expect(screen.getByText("The Octocat")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /disconnect/i })).toBeInTheDocument();
  });

  it("starts device flow and shows the user code", async () => {
    const user = userEvent.setup();
    vi.mocked(messaging.startGitHubDeviceAuth).mockResolvedValue({
      ok: true,
      userCode: "WDJB-MJHT",
      verificationUri: "https://github.com/login/device",
      deviceCode: "device-1",
      interval: 60,
      expiresIn: 900,
    });
    vi.mocked(messaging.pollGitHubDeviceAuth).mockResolvedValue({ ok: true, status: "pending" });
    vi.mocked(chrome.tabs.create).mockResolvedValue({} as chrome.tabs.Tab);

    render(<GitHubAuthSection />);
    await screen.findByRole("button", { name: /connect github/i });
    await user.click(screen.getByRole("button", { name: /connect github/i }));

    expect(await screen.findByTestId("github-user-code")).toHaveTextContent("WDJB-MJHT");
    expect(screen.getByText(/Waiting for authorization/i)).toBeInTheDocument();
    expect(chrome.tabs.create).toHaveBeenCalledWith({
      url: "https://github.com/login/device",
    });
  });

  it("shows connected state after a successful poll", async () => {
    const user = userEvent.setup();

    vi.mocked(messaging.startGitHubDeviceAuth).mockResolvedValue({
      ok: true,
      userCode: "ABCD-EFGH",
      verificationUri: "https://github.com/login/device",
      deviceCode: "device-2",
      // 0 so the first poll runs on the next timer tick without fake timers.
      interval: 0,
      expiresIn: 900,
    });
    vi.mocked(messaging.pollGitHubDeviceAuth).mockResolvedValue({
      ok: true,
      status: "authorized",
      auth: {
        accessToken: "gho_ok",
        tokenType: "bearer",
        scope: "repo,read:user",
        login: "monalisa",
      },
    });
    vi.mocked(chrome.tabs.create).mockResolvedValue({} as chrome.tabs.Tab);

    render(<GitHubAuthSection />);
    await screen.findByRole("button", { name: /connect github/i });
    await user.click(screen.getByRole("button", { name: /connect github/i }));

    // interval 0 polls immediately; may skip the awaiting UI if poll resolves fast.
    await waitFor(() => {
      expect(screen.getByText("@monalisa")).toBeInTheDocument();
    });
    expect(messaging.pollGitHubDeviceAuth).toHaveBeenCalledWith("device-2");
  });

  it("disconnects and returns to Connect", async () => {
    const user = userEvent.setup();
    vi.mocked(messaging.getGitHubAuthStatus).mockResolvedValue({
      ok: true,
      auth: {
        accessToken: "gho_x",
        tokenType: "bearer",
        scope: "repo",
        login: "octocat",
      },
    });
    vi.mocked(messaging.clearGitHubAuthSession).mockResolvedValue({ ok: true });

    render(<GitHubAuthSection />);
    await screen.findByText("@octocat");
    await user.click(screen.getByRole("button", { name: /disconnect/i }));

    expect(messaging.clearGitHubAuthSession).toHaveBeenCalled();
    expect(await screen.findByRole("button", { name: /connect github/i })).toBeInTheDocument();
  });
});
