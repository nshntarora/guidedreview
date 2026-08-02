import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GitHubAuthState } from "@extension/lib/types";
import * as messaging from "@extension/lib/messaging";
import { openVerificationUri, useGitHubDeviceAuth } from "./useGitHubDeviceAuth";

vi.mock("../messaging", () => ({
  startGitHubDeviceAuth: vi.fn(),
  pollGitHubDeviceAuth: vi.fn(),
}));

const auth: GitHubAuthState = {
  accessToken: "gho_x",
  tokenType: "bearer",
  scope: "repo",
  login: "octocat",
};

describe("openVerificationUri", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("prefers chrome.tabs.create when available", async () => {
    await openVerificationUri("https://github.com/login/device");
    expect(chrome.tabs.create).toHaveBeenCalledWith({
      url: "https://github.com/login/device",
    });
  });

  it("falls back to window.open when tabs.create is unavailable", async () => {
    const open = vi.fn();
    vi.stubGlobal("window", { ...window, open });
    const originalTabs = chrome.tabs;
    (chrome as unknown as { tabs: undefined }).tabs = undefined;

    await openVerificationUri("https://github.com/login/device");

    expect(open).toHaveBeenCalledWith(
      "https://github.com/login/device",
      "_blank",
      "noopener,noreferrer",
    );
    (chrome as unknown as { tabs: typeof originalTabs }).tabs = originalTabs;
  });
});

describe("useGitHubDeviceAuth", () => {
  beforeEach(() => {
    vi.mocked(messaging.startGitHubDeviceAuth).mockReset();
    vi.mocked(messaging.pollGitHubDeviceAuth).mockReset();
  });

  it("is a no-op when disabled", async () => {
    const { result } = renderHook(() => useGitHubDeviceAuth({ enabled: false }));

    await act(async () => {
      await result.current.startConnect();
    });

    expect(messaging.startGitHubDeviceAuth).not.toHaveBeenCalled();
    expect(result.current.flow).toEqual({ kind: "idle" });
  });

  it("moves to awaiting, polls, and notifies on authorized", async () => {
    const onAuthorized = vi.fn();
    vi.mocked(messaging.startGitHubDeviceAuth).mockResolvedValue({
      ok: true,
      userCode: "WDJB-MJHT",
      verificationUri: "https://github.com/login/device",
      deviceCode: "device-1",
      interval: 0,
      expiresIn: 900,
    });
    vi.mocked(messaging.pollGitHubDeviceAuth)
      .mockResolvedValueOnce({ ok: true, status: "pending" })
      .mockResolvedValueOnce({ ok: true, status: "authorized", auth });

    const { result } = renderHook(() => useGitHubDeviceAuth({ onAuthorized }));

    await act(async () => {
      await result.current.startConnect();
    });

    expect(result.current.busy).toBe(true);
    expect(result.current.flow).toEqual({
      kind: "awaiting",
      userCode: "WDJB-MJHT",
      verificationUri: "https://github.com/login/device",
      deviceCode: "device-1",
    });

    await waitFor(() => {
      expect(onAuthorized).toHaveBeenCalledWith(auth);
    });
    expect(messaging.pollGitHubDeviceAuth).toHaveBeenCalledWith("device-1");
    expect(result.current.flow).toEqual({ kind: "idle" });
    expect(result.current.busy).toBe(false);
  });

  it("surfaces a start error on the flow", async () => {
    vi.mocked(messaging.startGitHubDeviceAuth).mockResolvedValue({
      ok: false,
      error: "Device flow unavailable",
    });

    const { result } = renderHook(() => useGitHubDeviceAuth());

    await act(async () => {
      await result.current.startConnect();
    });

    expect(result.current.busy).toBe(false);
    expect(result.current.flow).toEqual({
      kind: "error",
      message: "Device flow unavailable",
    });
  });

  it("surfaces a poll failure on the flow", async () => {
    vi.mocked(messaging.startGitHubDeviceAuth).mockResolvedValue({
      ok: true,
      userCode: "ABCD-EFGH",
      verificationUri: "https://github.com/login/device",
      deviceCode: "device-2",
      interval: 0,
      expiresIn: 900,
    });
    vi.mocked(messaging.pollGitHubDeviceAuth).mockResolvedValue({
      ok: false,
      error: "expired_token",
    });

    const { result } = renderHook(() => useGitHubDeviceAuth());

    await act(async () => {
      await result.current.startConnect();
    });

    await waitFor(() => {
      expect(result.current.flow).toEqual({ kind: "error", message: "expired_token" });
    });
    expect(result.current.busy).toBe(false);
  });

  it("cancel stops polling and returns to idle", async () => {
    let resolvePoll: ((value: { ok: true; status: "pending" }) => void) | undefined;
    vi.mocked(messaging.startGitHubDeviceAuth).mockResolvedValue({
      ok: true,
      userCode: "CODE",
      verificationUri: "https://github.com/login/device",
      deviceCode: "device-3",
      interval: 0,
      expiresIn: 900,
    });
    // Hang the first poll so cancel can race it.
    vi.mocked(messaging.pollGitHubDeviceAuth).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePoll = resolve;
        }),
    );

    const { result } = renderHook(() => useGitHubDeviceAuth());

    await act(async () => {
      await result.current.startConnect();
    });
    expect(result.current.flow.kind).toBe("awaiting");

    // Let the zero-interval poll schedule fire and enter the hanging poll.
    await waitFor(() => {
      expect(messaging.pollGitHubDeviceAuth).toHaveBeenCalled();
    });

    act(() => {
      result.current.cancel();
    });

    expect(result.current.flow).toEqual({ kind: "idle" });
    expect(result.current.busy).toBe(false);

    // Stale poll resolution must not flip state after cancel.
    await act(async () => {
      resolvePoll?.({ ok: true, status: "pending" });
    });
    expect(result.current.flow).toEqual({ kind: "idle" });
  });

  it("respects slow_down by rescheduling with the longer interval", async () => {
    vi.useFakeTimers();
    try {
      vi.mocked(messaging.startGitHubDeviceAuth).mockResolvedValue({
        ok: true,
        userCode: "SLOW",
        verificationUri: "https://github.com/login/device",
        deviceCode: "device-4",
        interval: 1,
        expiresIn: 900,
      });
      vi.mocked(messaging.pollGitHubDeviceAuth)
        .mockResolvedValueOnce({ ok: true, status: "slow_down", interval: 3 })
        .mockResolvedValueOnce({ ok: true, status: "authorized", auth });

      const onAuthorized = vi.fn();
      const { result } = renderHook(() => useGitHubDeviceAuth({ onAuthorized }));

      await act(async () => {
        await result.current.startConnect();
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });
      expect(messaging.pollGitHubDeviceAuth).toHaveBeenCalledTimes(1);

      // Next poll uses the slow_down interval (3s), not the original 1s.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });
      expect(messaging.pollGitHubDeviceAuth).toHaveBeenCalledTimes(1);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000);
      });
      expect(messaging.pollGitHubDeviceAuth).toHaveBeenCalledTimes(2);
      expect(onAuthorized).toHaveBeenCalledWith(auth);
      expect(result.current.flow).toEqual({ kind: "idle" });
    } finally {
      vi.useRealTimers();
    }
  });
});
