import { expect, test } from "@playwright/test";
import { sampleDiff, samplePlan } from "../components/preview/sample";

test("sample review switches between the CLI and extension flows", async ({ page }, testInfo) => {
  const externalRequests: string[] = [];
  page.on("request", (request) => {
    if (/github\.com|api\.(anthropic|openai|groq|x\.ai)|generativelanguage/.test(request.url())) {
      externalRequests.push(request.url());
    }
  });
  await page.goto("/");
  const trigger = page.getByTestId("open-live-preview");
  await trigger.click();
  const overlay = page.getByTestId("guided-review-overlay");
  await expect(overlay).toBeFocused();
  expect(await trigger.evaluate((node) => Boolean(node.closest("[inert]")))).toBe(true);
  await expect(page.getByTestId("preview-mode-notice")).toContainText("Live preview");
  await expect(page.getByTestId("preview-mode-cli")).toHaveAttribute("aria-pressed", "true");
  const units = page.getByTestId("review-units");
  async function expectTokenUsage() {
    await expect(page.getByTestId("review-input-tokens")).toHaveText("8,420");
    await expect(page.getByTestId("review-output-tokens")).toHaveText("1,260");
  }
  await expect(page.getByTestId("navigation-tab-units")).toHaveAttribute("aria-selected", "true");
  await expect(units.getByTestId(/review-unit-/)).toHaveCount(5);
  await expectTokenUsage();
  await expect(page.getByTestId("diff-unit-title")).toHaveText("Define the retry contract");
  await expect(page.getByTestId("submit-review-button")).toContainText("Generate Prompt");

  const note = "Honor Retry-After when it exceeds the configured delay cap.";
  async function addRetryNote() {
    await units.getByTestId("review-unit-2").click();
    await overlay.focus();
    await page.keyboard.press("c");
    await page.keyboard.press("Enter");
    await page.getByTestId("comment-composer-input").fill(note);
    await page.getByTestId("comment-composer-save").click();
    await page.keyboard.press("Escape");
  }

  await addRetryNote();
  await page.getByTestId("submit-review-button").click();
  await expect(page.getByTestId("generate-prompt-text")).toContainText(note);
  await expect(page.getByTestId("generate-prompt-copy")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("generate-prompt-modal")).toHaveCount(0);
  await expect(page.getByTestId("submit-review-button")).toBeFocused();

  await page.getByTestId("open-settings").click();
  await expect(page.getByTestId("preview-unsupported-notice")).toContainText(
    "isn’t available in the live preview",
  );
  await page.getByTestId("preview-mode-chrome").click();
  await expect(page.getByTestId("preview-unsupported-notice")).toHaveCount(0);
  await expect(page.getByTestId("preview-mode-chrome")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("submit-review-button")).toContainText("Submit Review");
  await expect(page.getByTestId("navigation-tab-units")).toHaveAttribute("aria-selected", "true");
  await expect(page.getByTestId("diff-unit-title")).toHaveText("Define the retry contract");
  await expect(units.getByTestId(/review-unit-/)).toHaveCount(5);
  await expectTokenUsage();
  await page.getByTestId("review-summary").click();
  await overlay.focus();

  // Every fixture file and hunk must be represented by the prepared structure.
  expect(samplePlan.units).toHaveLength(5);
  const references = samplePlan.units.flatMap((unit) => unit.files);
  expect(references.map((file) => file.fileId).sort()).toEqual(
    sampleDiff.files.map((file) => file.path).sort(),
  );
  for (const file of sampleDiff.files) {
    expect(references.find((ref) => ref.fileId === file.path)?.hunkIds).toEqual(
      file.hunks.map((hunk) => hunk.id),
    );
  }

  await page.keyboard.press("ArrowRight");
  await expect(page.getByTestId("diff-unit-title")).toHaveText("Define the retry contract");
  await addRetryNote();
  await page.screenshot({ path: testInfo.outputPath("preview-desktop.png") });

  await page.getByTestId("submit-review-button").click();
  await expect(page.getByTestId("submit-review-modal")).toContainText(
    "will not post anything to GitHub",
  );
  await page.getByTestId("submit-review-event-REQUEST_CHANGES").click();
  await page
    .getByTestId("submit-review-body")
    .fill("Please fix the Retry-After boundary before merging.");
  await page.getByTestId("submit-review-confirm").click();
  await expect(page.getByTestId("review-submitted-summary")).toContainText(
    "Nothing was posted to GitHub",
  );
  await expect(page.getByTestId("review-submitted-modal")).toHaveAttribute(
    "data-comment-count",
    "1",
  );
  await page.getByTestId("review-submitted-exit").click();
  await expect(overlay).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe("");

  await page.setViewportSize({ width: 390, height: 844 });
  await trigger.click();
  const mobileNotice = page.getByTestId("live-preview-mobile-notice");
  await expect(mobileNotice).toContainText("available on larger screens");
  await expect(overlay).toHaveCount(0);
  expect(await trigger.evaluate((node) => Boolean(node.closest("[inert]")))).toBe(true);
  expect(await page.evaluate(() => document.body.style.overflow)).toBe("hidden");
  await page.keyboard.press("Tab");
  await expect(page.getByTestId("live-preview-mobile-dismiss")).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(page.getByTestId("live-preview-mobile-dismiss")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(mobileNotice).toHaveCount(0);
  await expect(trigger).toBeFocused();
  expect(await trigger.evaluate((node) => Boolean(node.closest("[inert]")))).toBe(false);
  expect(await page.evaluate(() => document.body.style.overflow)).toBe("");

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.keyboard.press("Control+p");
  await expect(overlay).toBeFocused();
  await expect(page.getByTestId("preview-mode-cli")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("navigation-tab-units")).toHaveAttribute("aria-selected", "true");
  await expect(units.getByTestId(/review-unit-/)).toHaveCount(5);
  await expectTokenUsage();
  expect(externalRequests).toEqual([]);
});
