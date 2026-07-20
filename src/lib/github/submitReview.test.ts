import { afterEach, describe, expect, it, vi } from "vitest";
import { submitPullRequestReview } from "./submitReview";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const pr = { owner: "acme", repo: "widget", number: 42 };
const headSha = "abc123def456";

function mockHeadThen(post: Response): ReturnType<typeof vi.fn> {
  return vi
    .fn()
    .mockResolvedValueOnce(jsonResponse({ head: { sha: headSha } }))
    .mockResolvedValueOnce(post);
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("submitPullRequestReview", () => {
  it("rejects empty body for COMMENT", async () => {
    const result = await submitPullRequestReview({
      accessToken: "tok",
      pr,
      body: "   ",
      event: "COMMENT",
      comments: [],
    });
    expect(result).toEqual({
      ok: false,
      code: "validation",
      error: "Add a review comment before submitting.",
    });
  });

  it("rejects empty body for REQUEST_CHANGES", async () => {
    const result = await submitPullRequestReview({
      accessToken: "tok",
      pr,
      body: "",
      event: "REQUEST_CHANGES",
      comments: [],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("validation");
  });

  it("always fetches head sha and posts commit_id even without comments", async () => {
    const fetchMock = mockHeadThen(
      jsonResponse({
        id: 99,
        html_url: "https://github.com/acme/widget/pull/42#pullrequestreview-99",
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await submitPullRequestReview({
      accessToken: "gho_token",
      pr,
      body: "LGTM",
      event: "APPROVE",
      comments: [],
    });

    expect(result).toEqual({
      ok: true,
      reviewId: 99,
      htmlUrl: "https://github.com/acme/widget/pull/42#pullrequestreview-99",
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://api.github.com/repos/acme/widget/pulls/42",
    );
    const [url, init] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(url).toBe("https://api.github.com/repos/acme/widget/pulls/42/reviews");
    expect(init.method).toBe("POST");
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer gho_token");
    expect(JSON.parse(init.body as string)).toEqual({
      event: "APPROVE",
      body: "LGTM",
      commit_id: headSha,
      comments: [],
    });
  });

  it("allows empty body for APPROVE", async () => {
    const fetchMock = mockHeadThen(
      jsonResponse({
        id: 1,
        html_url: "https://github.com/acme/widget/pull/42#pullrequestreview-1",
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await submitPullRequestReview({
      accessToken: "tok",
      pr,
      body: "",
      event: "APPROVE",
      comments: [],
    });

    expect(result.ok).toBe(true);
    const body = JSON.parse(
      (fetchMock.mock.calls[1] as [string, RequestInit])[1].body as string,
    );
    expect(body).toEqual({
      event: "APPROVE",
      commit_id: headSha,
      comments: [],
    });
    expect(body.body).toBeUndefined();
  });

  it("fetches head sha and posts multi-line comments", async () => {
    const fetchMock = mockHeadThen(
      jsonResponse({
        id: 7,
        html_url: "https://github.com/acme/widget/pull/42#pullrequestreview-7",
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await submitPullRequestReview({
      accessToken: "tok",
      pr,
      body: "Please fix",
      event: "REQUEST_CHANGES",
      comments: [
        {
          path: "src/a.ts",
          body: "nit",
          side: "RIGHT",
          line: 20,
          startLine: 18,
          startSide: "RIGHT",
        },
        {
          path: "src/b.ts",
          body: "single",
          side: "LEFT",
          line: 5,
        },
      ],
    });

    expect(result).toEqual({
      ok: true,
      reviewId: 7,
      htmlUrl: "https://github.com/acme/widget/pull/42#pullrequestreview-7",
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const postBody = JSON.parse(
      (fetchMock.mock.calls[1] as [string, RequestInit])[1].body as string,
    );
    expect(postBody).toEqual({
      event: "REQUEST_CHANGES",
      body: "Please fix",
      commit_id: headSha,
      comments: [
        {
          path: "src/a.ts",
          body: "nit",
          line: 20,
          side: "RIGHT",
          start_line: 18,
          start_side: "RIGHT",
        },
        {
          path: "src/b.ts",
          body: "single",
          line: 5,
          side: "LEFT",
        },
      ],
    });
  });

  it("maps 401 to not_authenticated with PR context", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ message: "Bad credentials" }, 401)),
    );

    const result = await submitPullRequestReview({
      accessToken: "bad",
      pr,
      body: "x",
      event: "COMMENT",
      comments: [],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("not_authenticated");
      expect(result.error).toContain("HTTP 401");
      expect(result.error).toContain("acme/widget#42");
      expect(result.error).toContain("Bad credentials");
      expect(result.error).toMatch(/Reconnect GitHub/i);
    }
  });

  it("maps 403 with API message and status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({ message: "Resource not accessible by integration" }, 403),
      ),
    );

    const result = await submitPullRequestReview({
      accessToken: "tok",
      pr,
      body: "x",
      event: "COMMENT",
      comments: [],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("forbidden");
      expect(result.error).toContain("HTTP 403");
      expect(result.error).toContain("Resource not accessible by integration");
      expect(result.error).toContain("acme/widget#42");
    }
  });

  it("maps 404 to not_found with detail, not bare Not Found", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(
          {
            message: "Not Found",
            documentation_url:
              "https://docs.github.com/rest/pulls/pulls#get-a-pull-request",
          },
          404,
        ),
      ),
    );

    const result = await submitPullRequestReview({
      accessToken: "tok",
      pr,
      body: "x",
      event: "COMMENT",
      comments: [],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("not_found");
      expect(result.error).not.toBe("Not Found");
      expect(result.error).toContain("HTTP 404");
      expect(result.error).toContain("acme/widget#42");
      expect(result.error).toContain("Not Found");
      expect(result.error).toContain("Docs:");
      expect(result.error).toMatch(/SSO|reconnect|repo access/i);
    }
  });

  it("maps 404 on POST after successful head fetch", async () => {
    const fetchMock = mockHeadThen(
      jsonResponse({ message: "Not Found" }, 404),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await submitPullRequestReview({
      accessToken: "tok",
      pr,
      body: "x",
      event: "COMMENT",
      comments: [],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("not_found");
      expect(result.error).toContain("submitting the review");
      expect(result.error).toContain("HTTP 404");
    }
  });

  it("maps 422 with nested errors and documentation_url", async () => {
    const fetchMock = mockHeadThen(
      jsonResponse(
        {
          message: "Unprocessable Entity",
          errors: [
            { message: "line must be part of the diff" },
            { message: "path is invalid" },
          ],
          documentation_url:
            "https://docs.github.com/rest/pulls/reviews#create-a-review-for-a-pull-request",
        },
        422,
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await submitPullRequestReview({
      accessToken: "tok",
      pr,
      body: "x",
      event: "COMMENT",
      comments: [],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("validation");
      expect(result.error).toContain("HTTP 422");
      expect(result.error).toContain("line must be part of the diff");
      expect(result.error).toContain("path is invalid");
      expect(result.error).toContain("Docs:");
    }
  });

  it("returns network error when fetch throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    const result = await submitPullRequestReview({
      accessToken: "tok",
      pr,
      body: "x",
      event: "COMMENT",
      comments: [],
    });

    expect(result).toMatchObject({
      ok: false,
      code: "network",
      error: expect.stringContaining("offline"),
    });
  });

  it("fails when head sha is missing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ head: {} })));

    const result = await submitPullRequestReview({
      accessToken: "tok",
      pr,
      body: "x",
      event: "COMMENT",
      comments: [
        { path: "a.ts", body: "c", side: "RIGHT", line: 1 },
      ],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("unknown");
      expect(result.error).toContain("acme/widget#42");
    }
  });
});
