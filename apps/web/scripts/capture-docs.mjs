// Run with the website already serving: pnpm --filter @guided-review/web screenshots:docs
// Optional: DOCS_SCREENSHOT_URL=http://localhost:4173 for a static export.
/* global document */
import { mkdir } from "node:fs/promises";
import { fileURLToPath, URL } from "node:url";
import { chromium, expect } from "@playwright/test";

const output = fileURLToPath(new URL("../public/docs/screenshots/", import.meta.url));
const baseURL = process.env.DOCS_SCREENSHOT_URL ?? "http://localhost:3000";
const captureStyle = `
  nextjs-portal { visibility: hidden; }
  [data-testid=preview-mode-notice] { display: none; }
  header:has([data-testid=preview-mode-notice]) { padding-top: 0.875rem; }
`;
const note =
  "Honor Retry-After even when it exceeds maxDelayMs. Add a regression test with a 10-second header and a 5-second cap.";

await mkdir(output, { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1600, height: 1000 },
    deviceScaleFactor: 2,
    reducedMotion: "reduce",
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  // Every action uses the preview's local fixture; block accidental provider/GitHub calls.
  await page.route(
    /https:\/\/([^/]*\.)?(github\.com|githubusercontent\.com|anthropic\.com|openai\.com|x\.ai)\//,
    (route) => {
      errors.push(`Unexpected external request: ${route.request().url()}`);
      return route.abort();
    },
  );
  await page.goto(baseURL);
  await page.getByTestId("open-live-preview").click();
  const overlay = page.getByTestId("guided-review-overlay");
  await expect(overlay).toBeVisible();

  async function capture(name, target = overlay) {
    await page.evaluate(() => document.fonts.ready);
    await page.mouse.move(1599, 999);
    await target.screenshot({
      path: `${output}/${name}.png`,
      animations: "disabled",
      style: captureStyle,
    });
    console.log(`Captured ${name}.png`);
  }

  async function selectBackoff() {
    await page.getByTestId("review-unit-3").click();
    await expect(page.getByTestId("diff-unit-title")).toHaveText("Schedule retries with jitter");
    await page.getByTestId("diff-view-unified-toggle").click();
    await expect(page.getByTestId("diff-file-cards")).toHaveAttribute("aria-busy", "false");
    await overlay.focus();
  }

  async function composeNote() {
    await selectBackoff();
    await page.keyboard.press("c");
    // Anchor the note on the return statement that truncates Retry-After.
    for (let line = 1; line < 11; line++) await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await page.getByTestId("comment-composer-input").fill(note);
  }

  await page.getByTestId("preview-mode-chrome").click();
  await selectBackoff();
  await capture("reading-the-overlay");

  await page.getByTestId("navigation-tab-files").click();
  // Use the fixture's actual path, which is also the stable file-row test ID.
  const backoffFile = page.getByTestId("review-files").getByTestId(/review-file-.*backoff\.ts$/);
  await backoffFile.click();
  await overlay.focus();
  await capture("files-navigation");
  await page.getByTestId("navigation-tab-units").click();
  await selectBackoff();

  await page.getByTestId("open-command-palette").click();
  await page.getByTestId("diff-search-input").fill("retryAfter");
  await expect(page.getByTestId("diff-search-match-mark").first()).toBeVisible();
  await capture("diff-search", page.getByTestId("command-palette"));
  await page.keyboard.press("Escape");

  await composeNote();
  await capture("line-comment");
  await page.getByTestId("comment-composer-save").click();
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("draft-comment-body")).toContainText(note);
  await capture("draft-comment");

  await page.getByTestId("submit-review-button").click();
  await capture("submit-review-type", page.getByTestId("submit-review-modal"));
  await page.getByTestId("submit-review-event-REQUEST_CHANGES").click();
  await page
    .getByTestId("submit-review-body")
    .fill(
      "Please preserve the server's Retry-After delay and cover the boundary where it exceeds the configured cap.",
    );
  await capture("submit-review-summary", page.getByTestId("submit-review-modal"));
  await page.keyboard.press("Escape");

  await page.getByTestId("preview-mode-cli").click();
  await selectBackoff();
  await capture("cli-review");
  await composeNote();
  await page.getByTestId("comment-composer-save").click();
  await page.keyboard.press("Escape");
  await page.getByTestId("submit-review-button").click();
  await expect(page.getByTestId("generate-prompt-text")).toContainText(note);
  await capture("generate-prompt", page.getByTestId("generate-prompt-modal"));

  if (errors.length) throw new Error(errors.join("\n"));
} finally {
  await browser.close();
}
