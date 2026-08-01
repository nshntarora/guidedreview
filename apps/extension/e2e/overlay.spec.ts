import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ReviewPlan } from "../src/lib/types";
import { expect, test } from "./fixtures";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PR_URL = "https://github.com/acme/widgets/pull/1";
const PULLS_LIST_URL = "https://github.com/acme/widgets/pulls";
const PR_FIXTURE_PATH = path.resolve(__dirname, "fixtures/pr-page.html");
const PR_MODERN_FIXTURE_PATH = path.resolve(__dirname, "fixtures/pr-page-modern.html");
const PULLS_LIST_FIXTURE_PATH = path.resolve(__dirname, "fixtures/pulls-list.html");

const CANNED_DIFF = [
  "diff --git a/src/foo.ts b/src/foo.ts",
  "index 1234567..89abcde 100644",
  "--- a/src/foo.ts",
  "+++ b/src/foo.ts",
  "@@ -1,3 +1,4 @@",
  " const a = 1;",
  "-const b = 2;",
  "+const b = 3;",
  "+const c = 4;",
  " export { a, b };",
  "",
].join("\n");

const CANNED_PLAN: ReviewPlan = {
  units: [
    {
      id: "u1",
      title: "Update foo's exported constant",
      kind: "change",
      context: "Bumping const b to 3 and adding const c, per the PR description.",
      files: [{ fileId: "src/foo.ts", hunkIds: ["src/foo.ts#0"], role: "core_logic" }],
    },
  ],
};

/** Build a minimal Anthropic SSE stream that yields structured plan JSON as text deltas. */
function anthropicSseForPlan(plan: ReviewPlan): string {
  const text = JSON.stringify(plan);
  // Split so the stream exercises partial JSON handling across multiple events.
  const mid = Math.ceil(text.length / 2);
  const chunk1 = text.slice(0, mid);
  const chunk2 = text.slice(mid);

  const events = [
    `event: message_start\ndata: ${JSON.stringify({ type: "message_start", message: { id: "msg_e2e", type: "message", role: "assistant", content: [], model: "claude-opus-4-8" } })}\n\n`,
    `event: content_block_start\ndata: ${JSON.stringify({ type: "content_block_start", index: 0, content_block: { type: "text", text: "" } })}\n\n`,
    `event: content_block_delta\ndata: ${JSON.stringify({ type: "content_block_delta", index: 0, delta: { type: "text_delta", text: chunk1 } })}\n\n`,
    `event: content_block_delta\ndata: ${JSON.stringify({ type: "content_block_delta", index: 0, delta: { type: "text_delta", text: chunk2 } })}\n\n`,
    `event: content_block_stop\ndata: ${JSON.stringify({ type: "content_block_stop", index: 0 })}\n\n`,
    `event: message_delta\ndata: ${JSON.stringify({ type: "message_delta", delta: { stop_reason: "end_turn" }, usage: { output_tokens: 10 } })}\n\n`,
    `event: message_stop\ndata: ${JSON.stringify({ type: "message_stop" })}\n\n`,
  ];
  return events.join("");
}

test.describe("Guided review overlay", () => {
  test("clicking Start Guided Review builds and shows a review plan", async ({
    context,
    extensionId,
  }) => {
    // Seed provider settings via the real options page (real chrome.storage.local), the same
    // way a user would configure the extension before it can call an AI provider.
    const optionsPage = await context.newPage();
    await optionsPage.goto(`chrome-extension://${extensionId}/src/options/index.html`);
    await optionsPage.getByLabel("API Key").fill("sk-e2e-test-key");
    await optionsPage.getByRole("button", { name: "Save" }).click();
    await expect(optionsPage.getByText("Saved")).toBeVisible();
    await optionsPage.close();

    // Stub every external call the extension makes for this PR: the page itself, the raw
    // diff, and the AI provider's streaming completion — nothing here touches the real internet.
    await context.route(PR_URL, (route) =>
      route.fulfill({ path: PR_FIXTURE_PATH, contentType: "text/html" }),
    );
    await context.route(`${PR_URL}.diff`, (route) =>
      route.fulfill({ status: 200, contentType: "text/plain", body: CANNED_DIFF }),
    );
    await context.route("https://api.anthropic.com/v1/messages", (route) =>
      route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        body: anthropicSseForPlan(CANNED_PLAN),
      }),
    );

    const page = await context.newPage();
    await page.goto(PR_URL);

    const startButton = page.getByRole("button", { name: "Start Guided Review" });
    await expect(startButton).toBeVisible();
    await startButton.click();

    // Playwright locators pierce open shadow roots by default, so these resolve inside the
    // overlay's shadow DOM without any special selector syntax.
    // First unit is always the synthetic PR description.
    await expect(page.getByText("PR Description").first()).toBeVisible();

    // After the plan streams in, the AI unit is listed and reachable via Next.
    await expect(page.getByText(CANNED_PLAN.units[0].title)).toBeVisible();
    await page.getByRole("button", { name: /next/i }).click();
    await expect(page.getByText(CANNED_PLAN.units[0].context)).toBeVisible();
  });

  test("injects Start Guided Review on the modern React PR header", async ({ context }) => {
    await context.route(PR_URL, (route) =>
      route.fulfill({ path: PR_MODERN_FIXTURE_PATH, contentType: "text/html" }),
    );

    const page = await context.newPage();
    await page.goto(PR_URL);

    const startButton = page.getByRole("button", { name: "Start Guided Review" });
    await expect(startButton).toBeVisible();

    // Button should land in the modern PageHeader actions slot (unhidden), not only the fallback host.
    await expect(
      page.locator('[data-component="PH_Actions"] #guided-review-start-btn'),
    ).toBeVisible();
    await expect(page.locator('[data-component="PH_Actions"]')).not.toHaveClass(/d-none/);
  });

  test("injects Start Guided Review on PR tab subpaths", async ({ context }) => {
    const tabUrls = [
      "https://github.com/acme/widgets/pull/1",
      "https://github.com/acme/widgets/pull/1/files",
      "https://github.com/acme/widgets/pull/1/commits",
      "https://github.com/acme/widgets/pull/1/checks",
    ];

    for (const url of tabUrls) {
      await context.route(url, (route) =>
        route.fulfill({ path: PR_MODERN_FIXTURE_PATH, contentType: "text/html" }),
      );
    }

    const page = await context.newPage();
    for (const url of tabUrls) {
      await page.goto(url);
      await expect(page.getByRole("button", { name: "Start Guided Review" })).toBeVisible();
    }
  });

  test("injects Start Guided Review after SPA navigation from the PR list", async ({ context }) => {
    // Content script matches all of github.com so it is already running on the
    // list page; MutationObserver + URL check should inject after a client-side
    // route change without a full reload.
    await context.route(PULLS_LIST_URL, (route) =>
      route.fulfill({ path: PULLS_LIST_FIXTURE_PATH, contentType: "text/html" }),
    );
    await context.route(PR_URL, (route) =>
      route.fulfill({ path: PR_MODERN_FIXTURE_PATH, contentType: "text/html" }),
    );

    const page = await context.newPage();
    await page.goto(PULLS_LIST_URL);

    await expect(page.getByRole("button", { name: "Start Guided Review" })).toHaveCount(0);

    // Simulate GitHub SPA navigation: history update + swap in PR header DOM
    // (the MutationObserver reacts to the DOM mutation).
    await page.evaluate((prUrl) => {
      history.pushState({}, "", prUrl);
      document.body.innerHTML = `
        <header data-component="PageHeader">
          <div data-component="TitleArea">
            <h1 data-component="PH_Title">
              <span data-component="Text">Add feature</span>
            </h1>
            <div data-component="PH_Actions" class="d-none"></div>
          </div>
          <div data-component="PH_Navigation">
            <div class="right-actions"></div>
            <nav aria-label="Pull request navigation tabs">
              <a role="tab" href="/acme/widgets/pull/1" aria-selected="true">Conversation</a>
            </nav>
          </div>
        </header>
      `;
    }, PR_URL);

    await expect(page.getByRole("button", { name: "Start Guided Review" })).toBeVisible();
    await expect(
      page.locator('[data-component="PH_Actions"] #guided-review-start-btn'),
    ).toBeVisible();
  });
});
