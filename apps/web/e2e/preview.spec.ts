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
  const trigger = page.getByRole("button", { name: "Try Live Preview" });
  await trigger.click();
  const overlay = page.getByTestId("guided-review-overlay");
  await expect(overlay).toBeFocused();
  expect(await trigger.evaluate((node) => Boolean(node.closest("[inert]")))).toBe(true);
  await expect(page.getByTestId("preview-mode-notice")).toContainText("Live preview");
  await expect(page.getByRole("button", { name: "CLI", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  const units = page.getByRole("navigation", { name: "Review Units" });
  await expect(units.getByRole("button")).toHaveCount(6);
  await expect(page.getByTestId("submit-review-button")).toContainText("Generate Prompt");
  await expect(units.getByRole("button", { name: /Change summary/ })).toHaveAttribute(
    "aria-current",
    "true",
  );

  await page.getByTestId("open-settings").click();
  await expect(page.getByTestId("preview-unsupported-notice")).toContainText(
    "isn’t available in the live preview",
  );
  await page.getByRole("button", { name: "Dismiss preview notification" }).click();

  await page.getByRole("button", { name: "Chrome", exact: true }).click();
  await expect(page.getByRole("button", { name: "Chrome", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByTestId("submit-review-button")).toContainText("Submit Review");
  await expect(units.getByRole("button", { name: /PR Description/ })).toHaveAttribute(
    "aria-current",
    "true",
  );

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
  await units.getByRole("button", { name: /Schedule retries with jitter/ }).click();
  await page.screenshot({ path: testInfo.outputPath("preview-desktop.png") });
  await overlay.focus();
  await page.keyboard.press("c");
  await page.keyboard.press("Enter");
  await page
    .getByTestId("comment-composer-input")
    .fill("Honor Retry-After when it exceeds the configured delay cap.");
  await page.getByTestId("comment-composer-save").click();
  await page.keyboard.press("Escape");

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
  await expect(page.getByTestId("submit-review-button")).toContainText("Generate Prompt");
  await expect(page.getByTestId("preview-mode-notice")).toBeInViewport();
  await expect(units.getByRole("button", { name: /Change summary/ })).toHaveAttribute(
    "aria-current",
    "true",
  );
  await expect(page.getByRole("button", { name: /Next review unit/ })).toBeInViewport();
  await page.getByRole("button", { name: /Next review unit/ }).click();
  await expect(page.getByRole("button", { name: "Unified", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByRole("button", { name: "Exit", exact: true })).toBeInViewport();
  expect(await overlay.evaluate((node) => node.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("preview-mobile.png") });
  await overlay.focus();
  await page.keyboard.press("Escape");
  await page.getByTestId("confirmation-ok").click();
  await expect(trigger).toBeFocused();
  expect(externalRequests).toEqual([]);
});
