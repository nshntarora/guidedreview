import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchGitHubUser, pollAccessToken, requestDeviceCode } from "./deviceOAuth";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("requestDeviceCode", () => {
  it("posts client_id and scope and maps a successful response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        device_code: "device-abc",
        user_code: "WDJB-MJHT",
        verification_uri: "https://github.com/login/device",
        expires_in: 900,
        interval: 5,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await requestDeviceCode("client-123", "repo read:user");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://github.com/login/device/code",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ client_id: "client-123", scope: "repo read:user" }),
      }),
    );
    expect(result).toEqual({
      deviceCode: "device-abc",
      userCode: "WDJB-MJHT",
      verificationUri: "https://github.com/login/device",
      expiresIn: 900,
      interval: 5,
    });
  });

  it("throws a user-facing error on HTTP failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          jsonResponse(
            { error: "incorrect_client_credentials", error_description: "Bad client" },
            401,
          ),
        ),
    );

    await expect(requestDeviceCode("bad", "repo")).rejects.toThrow(/Bad client/);
  });

  it("throws on incomplete success payloads", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ device_code: "only" })));

    await expect(requestDeviceCode("c", "repo")).rejects.toThrow(/incomplete/i);
  });
});

describe("pollAccessToken", () => {
  it("returns authorized when access_token is present", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          access_token: "gho_token",
          token_type: "bearer",
          scope: "repo,read:user",
        }),
      ),
    );

    await expect(pollAccessToken("client", "device")).resolves.toEqual({
      status: "authorized",
      accessToken: "gho_token",
      tokenType: "bearer",
      scope: "repo,read:user",
    });
  });

  it("maps authorization_pending", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ error: "authorization_pending" })),
    );

    await expect(pollAccessToken("c", "d")).resolves.toEqual({ status: "pending" });
  });

  it("maps slow_down with interval", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ error: "slow_down", interval: 10 })),
    );

    await expect(pollAccessToken("c", "d")).resolves.toEqual({
      status: "slow_down",
      interval: 10,
    });
  });

  it("maps expired_token and access_denied", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ error: "expired_token" })));
    await expect(pollAccessToken("c", "d")).resolves.toEqual({ status: "expired" });

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ error: "access_denied" })));
    await expect(pollAccessToken("c", "d")).resolves.toEqual({ status: "denied" });
  });

  it("maps device_flow_disabled to a clear error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ error: "device_flow_disabled" })),
    );

    const result = await pollAccessToken("c", "d");
    expect(result.status).toBe("error");
    if (result.status === "error") {
      expect(result.message).toMatch(/Device flow is not enabled/i);
    }
  });
});

describe("fetchGitHubUser", () => {
  it("maps login, avatar, and name", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        login: "octocat",
        avatar_url: "https://avatars.example/octocat",
        name: "The Octocat",
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const user = await fetchGitHubUser("gho_token");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.github.com/user",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer gho_token",
        }),
      }),
    );
    expect(user).toEqual({
      login: "octocat",
      avatarUrl: "https://avatars.example/octocat",
      name: "The Octocat",
    });
  });

  it("throws when login is missing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ id: 1 })));
    await expect(fetchGitHubUser("t")).rejects.toThrow(/username/i);
  });
});
