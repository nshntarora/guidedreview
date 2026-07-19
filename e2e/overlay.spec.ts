import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ReviewPlan } from "../src/lib/types";
import { expect, test } from "./fixtures";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PR_URL = "https://github.com/acme/widgets/pull/1";
const PR_FIXTURE_PATH = path.resolve(__dirname, "fixtures/pr-page.html");

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
      context: "Bumping const b to 3 and adding const c, per the PR description.",
      files: [{ fileId: "src/foo.ts", hunkIds: ["src/foo.ts#0"], role: "core_logic" }],
    },
  ],
};

test.describe("Guided review overlay", () => {
  test("clicking Start Guided Review builds and shows a review plan", async ({ context, extensionId }) => {
    // Seed provider settings via the real options page (real chrome.storage.local), the same
    // way a user would configure the extension before it can call an AI provider.
    const optionsPage = await context.newPage();
    await optionsPage.goto(`chrome-extension://${extensionId}/src/options/index.html`);
    await optionsPage.getByLabel("API key").fill("sk-e2e-test-key");
    await optionsPage.getByRole("button", { name: "Save" }).click();
    await expect(optionsPage.getByText("Saved")).toBeVisible();
    await optionsPage.close();

    // Stub every external call the extension makes for this PR: the page itself, the raw
    // diff, and the AI provider's completion — nothing here touches the real internet.
    await context.route(PR_URL, (route) => route.fulfill({ path: PR_FIXTURE_PATH, contentType: "text/html" }));
    await context.route(`${PR_URL}.diff`, (route) =>
      route.fulfill({ status: 200, contentType: "text/plain", body: CANNED_DIFF }),
    );
    await context.route("https://api.anthropic.com/v1/messages", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ content: [{ type: "text", text: JSON.stringify(CANNED_PLAN) }] }),
      }),
    );

    const page = await context.newPage();
    await page.goto(PR_URL);

    const startButton = page.getByRole("button", { name: "Start Guided Review" });
    await expect(startButton).toBeVisible();
    await startButton.click();

    // Playwright locators pierce open shadow roots by default, so these resolve inside the
    // overlay's shadow DOM without any special selector syntax.
    await expect(page.getByText(CANNED_PLAN.units[0].title)).toBeVisible();
    await expect(page.getByText(CANNED_PLAN.units[0].context)).toBeVisible();
  });
});
