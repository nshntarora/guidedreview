/**
 * GitHub OAuth 2.0 device authorization grant (RFC 8628).
 * Pure HTTP helpers — no Chrome APIs; storage and messaging live elsewhere.
 *
 * @see https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps#device-flow
 */

interface DeviceCodeResponse {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  expiresIn: number;
  interval: number;
}

type PollTokenResult =
  | { status: "pending" }
  | { status: "slow_down"; interval: number }
  | { status: "authorized"; accessToken: string; tokenType: string; scope: string }
  | { status: "expired" }
  | { status: "denied" }
  | { status: "error"; message: string };

interface GitHubUserInfo {
  login: string;
  avatarUrl?: string;
  name?: string;
}

const DEVICE_CODE_URL = "https://github.com/login/device/code";
const ACCESS_TOKEN_URL = "https://github.com/login/oauth/access_token";
const USER_URL = "https://api.github.com/user";
const GRANT_TYPE = "urn:ietf:params:oauth:grant-type:device_code";

const JSON_HEADERS = {
  Accept: "application/json",
  "Content-Type": "application/json",
} as const;

function networkError(action: string, error: unknown): Error {
  const detail = error instanceof Error ? error.message : String(error);
  return new Error(`Network error while ${action}: ${detail}`);
}

/**
 * Step 1: request device + user verification codes from GitHub.
 */
export async function requestDeviceCode(
  clientId: string,
  scope: string,
): Promise<DeviceCodeResponse> {
  let response: Response;
  try {
    response = await fetch(DEVICE_CODE_URL, {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ client_id: clientId, scope }),
    });
  } catch (error) {
    throw networkError("requesting a GitHub device code", error);
  }

  const body = (await response.json().catch(() => null)) as Record<string, unknown> | null;

  if (!response.ok) {
    const message =
      githubErrorMessage(body) ?? `Could not start GitHub sign-in (HTTP ${response.status}).`;
    throw new Error(message);
  }

  if (!body) {
    throw new Error("GitHub returned an empty response when starting device sign-in.");
  }

  const deviceCode = stringField(body, "device_code");
  const userCode = stringField(body, "user_code");
  const verificationUri = stringField(body, "verification_uri");
  const expiresIn = numberField(body, "expires_in");
  const interval = numberField(body, "interval");

  if (
    !deviceCode ||
    !userCode ||
    !verificationUri ||
    expiresIn === undefined ||
    interval === undefined
  ) {
    throw new Error("GitHub returned an incomplete device code response.");
  }

  return {
    deviceCode,
    userCode,
    verificationUri,
    expiresIn,
    interval: Math.max(1, interval),
  };
}

/**
 * Step 3: poll for the access token (or a pending/error status).
 */
export async function pollAccessToken(
  clientId: string,
  deviceCode: string,
): Promise<PollTokenResult> {
  let response: Response;
  try {
    response = await fetch(ACCESS_TOKEN_URL, {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        client_id: clientId,
        device_code: deviceCode,
        grant_type: GRANT_TYPE,
      }),
    });
  } catch (error) {
    return {
      status: "error",
      message: networkError("checking GitHub authorization", error).message,
    };
  }

  const body = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return {
      status: "error",
      message: `GitHub returned an empty token response (HTTP ${response.status}).`,
    };
  }

  // Successful token responses are typically 200; error payloads also use 200 with `error`.
  const errorCode = stringField(body, "error");
  if (errorCode) {
    return mapDeviceError(errorCode, body);
  }

  const accessToken = stringField(body, "access_token");
  if (!accessToken) {
    if (!response.ok) {
      return {
        status: "error",
        message: githubErrorMessage(body) ?? `Token request failed (HTTP ${response.status}).`,
      };
    }
    return {
      status: "error",
      message: "GitHub returned a token response without an access token.",
    };
  }

  return {
    status: "authorized",
    accessToken,
    tokenType: stringField(body, "token_type") ?? "bearer",
    scope: stringField(body, "scope") ?? "",
  };
}

/**
 * After authorization, load the authenticated user for the Options UI.
 */
export async function fetchGitHubUser(accessToken: string): Promise<GitHubUserInfo> {
  let response: Response;
  try {
    response = await fetch(USER_URL, {
      method: "GET",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${accessToken}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
  } catch (error) {
    throw networkError("loading your GitHub profile", error);
  }

  const body = (await response.json().catch(() => null)) as Record<string, unknown> | null;

  if (!response.ok) {
    const message =
      githubErrorMessage(body) ?? `Could not load your GitHub profile (HTTP ${response.status}).`;
    throw new Error(message);
  }

  const login = stringField(body, "login");
  if (!login) {
    throw new Error("GitHub profile response was missing a username.");
  }

  const avatarUrl = stringField(body, "avatar_url");
  const name = stringField(body, "name");

  return {
    login,
    ...(avatarUrl ? { avatarUrl } : {}),
    ...(name ? { name } : {}),
  };
}

function mapDeviceError(errorCode: string, body: Record<string, unknown>): PollTokenResult {
  switch (errorCode) {
    case "authorization_pending":
      return { status: "pending" };
    case "slow_down": {
      const interval = numberField(body, "interval");
      return {
        status: "slow_down",
        // GitHub adds 5s on slow_down; prefer server value when present.
        interval: interval !== undefined ? Math.max(1, interval) : 10,
      };
    }
    case "expired_token":
      return { status: "expired" };
    case "access_denied":
      return { status: "denied" };
    case "device_flow_disabled":
      return {
        status: "error",
        message:
          "Device flow is not enabled for this GitHub OAuth App. Enable it in the app settings.",
      };
    case "incorrect_client_credentials":
      return {
        status: "error",
        message: "Invalid GitHub OAuth client ID. Check VITE_GITHUB_CLIENT_ID and rebuild.",
      };
    case "incorrect_device_code":
      return {
        status: "error",
        message: "The device code is no longer valid. Start the connection again.",
      };
    case "unsupported_grant_type":
      return {
        status: "error",
        message: "GitHub rejected the device grant type. Try connecting again.",
      };
    default:
      return {
        status: "error",
        message: githubErrorMessage(body) ?? `GitHub authorization failed (${errorCode}).`,
      };
  }
}

function githubErrorMessage(body: Record<string, unknown> | null): string | undefined {
  if (!body) return undefined;
  const description = stringField(body, "error_description");
  if (description) return description;
  const message = stringField(body, "message");
  if (message) return message;
  return undefined;
}

function stringField(body: Record<string, unknown> | null, key: string): string | undefined {
  if (!body) return undefined;
  const value = body[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function numberField(body: Record<string, unknown> | null, key: string): number | undefined {
  if (!body) return undefined;
  const value = body[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}
