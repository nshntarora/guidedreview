import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConnectGitHubModal } from "./ConnectGitHubModal";
import * as messaging from "../../../lib/messaging";
import * as oauthConfig from "../../../lib/github/oauthConfig";
import * as deviceAuth from "../../../lib/github/useGitHubDeviceAuth";

vi.mock("../../../lib/messaging", () => ({
  startGitHubDeviceAuth: vi.fn(),
  pollGitHubDeviceAuth: vi.fn(),
}));

vi.mock("../../../lib/github/oauthConfig", () => ({
  isGitHubOAuthConfigured: vi.fn(() => true),
}));

const DEVICE_START = {
  ok: true as const,
  userCode: "WDJB-MJHT",
  verificationUri: "https://github.com/login/device",
  deviceCode: "device-1",
  interval: 60,
  expiresIn: 900,
};

async function startAwaitingFlow(user: ReturnType<typeof userEvent.setup>) {
  vi.mocked(messaging.startGitHubDeviceAuth).mockResolvedValue(DEVICE_START);
  vi.mocked(messaging.pollGitHubDeviceAuth).mockResolvedValue({
    ok: true,
    status: "pending",
  });

  render(
    <ConnectGitHubModal open onClose={vi.fn()} onAuthenticated={vi.fn()} />,
  );
  await user.click(screen.getByTestId("connect-github-connect"));
  expect(await screen.findByTestId("connect-github-user-code")).toHaveTextContent(
    "WDJB-MJHT",
  );
}

describe("ConnectGitHubModal", () => {
  let openVerificationUriSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.mocked(oauthConfig.isGitHubOAuthConfigured).mockReturnValue(true);
    vi.mocked(messaging.startGitHubDeviceAuth).mockReset();
    vi.mocked(messaging.pollGitHubDeviceAuth).mockReset();
    openVerificationUriSpy = vi
      .spyOn(deviceAuth, "openVerificationUri")
      .mockResolvedValue(undefined);
  });

  afterEach(() => {
    openVerificationUriSpy.mockRestore();
  });

  it("renders nothing when closed", () => {
    const { container } = render(
      <ConnectGitHubModal open={false} onClose={vi.fn()} onAuthenticated={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the auth prompt, brand logo, and Connect button with Enter hint", () => {
    render(
      <ConnectGitHubModal open onClose={vi.fn()} onAuthenticated={vi.fn()} />,
    );

    expect(screen.getByTestId("connect-github-modal")).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Connect GitHub" })).toBeInTheDocument();
    expect(screen.getByTestId("connect-github-logo")).toBeInTheDocument();
    expect(screen.getByTestId("connect-github-prompt")).toHaveTextContent(
      /authenticate via GitHub to submit your reviews/i,
    );
    const connect = screen.getByTestId("connect-github-connect");
    expect(connect).toBeInTheDocument();
    expect(connect).toHaveTextContent(/Connect GitHub/);
    expect(connect.querySelector("kbd")).toHaveTextContent("Enter");
  });

  it("shows a setup message when OAuth is not configured", () => {
    vi.mocked(oauthConfig.isGitHubOAuthConfigured).mockReturnValue(false);
    render(
      <ConnectGitHubModal open onClose={vi.fn()} onAuthenticated={vi.fn()} />,
    );

    expect(screen.getByText(/isn’t configured in this build/i)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /connect github/i }),
    ).not.toBeInTheDocument();
  });

  it("starts device flow, shows the user code, and does not open GitHub yet", async () => {
    const user = userEvent.setup();
    await startAwaitingFlow(user);

    expect(screen.getByText(/Waiting for authorization/i)).toBeInTheDocument();
    expect(screen.getByTestId("connect-github-copy-hint")).toHaveTextContent(
      /Copy this code, then paste it on the GitHub tab/i,
    );
    expect(screen.getByTestId("connect-github-enter-code")).toHaveTextContent(
      /Enter Code On Github/,
    );
    expect(
      screen.getByTestId("connect-github-enter-code").querySelector("kbd"),
    ).toHaveTextContent("Enter");
    expect(openVerificationUriSpy).not.toHaveBeenCalled();
  });

  it("opens GitHub when Enter Code On Github is clicked", async () => {
    const user = userEvent.setup();
    await startAwaitingFlow(user);

    await user.click(screen.getByTestId("connect-github-enter-code"));
    expect(openVerificationUriSpy).toHaveBeenCalledTimes(1);
    expect(openVerificationUriSpy).toHaveBeenCalledWith(
      "https://github.com/login/device",
    );
  });

  it("calls onAuthenticated after a successful poll", async () => {
    const user = userEvent.setup();
    const onAuthenticated = vi.fn();

    vi.mocked(messaging.startGitHubDeviceAuth).mockResolvedValue({
      ok: true,
      userCode: "ABCD-EFGH",
      verificationUri: "https://github.com/login/device",
      deviceCode: "device-2",
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

    render(
      <ConnectGitHubModal
        open
        onClose={vi.fn()}
        onAuthenticated={onAuthenticated}
      />,
    );
    await user.click(screen.getByTestId("connect-github-connect"));

    await waitFor(() => {
      expect(onAuthenticated).toHaveBeenCalled();
    });
  });

  it("shows an error and allows retry", async () => {
    const user = userEvent.setup();
    vi.mocked(messaging.startGitHubDeviceAuth).mockResolvedValueOnce({
      ok: false,
      error: "Device code request failed.",
    });

    render(
      <ConnectGitHubModal open onClose={vi.fn()} onAuthenticated={vi.fn()} />,
    );
    await user.click(screen.getByTestId("connect-github-connect"));

    expect(await screen.findByTestId("connect-github-error")).toHaveTextContent(
      /Device code request failed/i,
    );
    expect(screen.getByTestId("connect-github-retry")).toBeInTheDocument();
  });

  it("calls onClose when Cancel is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <ConnectGitHubModal open onClose={onClose} onAuthenticated={vi.fn()} />,
    );

    await user.click(screen.getByTestId("connect-github-cancel"));
    expect(onClose).toHaveBeenCalled();
  });
});
