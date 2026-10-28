import { commitInRepo, expect, reviewUrl, test } from "./fixtures";

test.describe("CLI review overlay", () => {
  test("boots a file-by-file review", async ({ page, reviewServer }) => {
    await page.goto(reviewUrl(reviewServer), { waitUntil: "domcontentloaded" });

    await expect(page.getByTestId("review-summary")).toHaveCount(0);
    await expect(page.getByTestId("description-pane")).toHaveCount(0);
    await expect(page.getByTestId("diff-file-header")).toContainText("feat.ts");
    await expect(page.getByTestId("context-pane").getByTestId("commit-card")).toContainText(
      "add feat",
    );
    await expect(page.getByTestId("context-pane").getByTestId("uncommitted-card")).toBeVisible();
    await page.keyboard.press("ArrowLeft");
    await expect(page.getByTestId("diff-file-header")).toContainText("feat.ts");
    await expect(page.getByTestId("review-file-feat.ts")).toBeVisible();
    await expect(page.getByTestId("review-scope-select")).toBeVisible();
    await expect(page.getByTestId("navigation-tab-units")).toBeVisible();
    await expect(page.getByTestId("guided-review-overlay")).toBeFocused();

    await page.keyboard.press("ArrowDown");
    await expect(page.getByTestId("review-scope-select-option-branch")).toHaveCount(0);
  });

  test("Structure with AI without a key opens settings", async ({ page, reviewServer }) => {
    await page.goto(reviewUrl(reviewServer), { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("navigation-tab-units")).toBeVisible();

    await page.getByTestId("navigation-tab-units").click();
    await page.getByTestId("connect-provider-open-settings").click();

    await expect(page).toHaveURL(/#settings/);
    await expect(page.getByTestId("settings-modal")).toBeVisible();
    await expect(page.getByTestId("settings-provider")).toBeVisible();
  });

  test("provider setup, generation failure and retry preserve file notes and selection", async ({
    page,
    reviewServer,
  }) => {
    let calls = 0;
    const unit = {
      id: "feature",
      title: "Introduce the feature",
      kind: "change",
      context: "Feature context",
      files: [{ fileId: "feat.ts", hunkIds: [], role: "core_logic" }],
    };
    await page.route("**/api/plan", (route) => {
      calls++;
      const messages =
        calls === 1
          ? [
              { type: "UNIT", unit },
              {
                type: "ERROR",
                error: { message: "Provider disconnected. Retry the review plan." },
              },
            ]
          : [{ type: "DONE", plan: { units: [unit] } }];
      return route.fulfill({
        contentType: "text/event-stream",
        body: messages.map((message) => `data: ${JSON.stringify(message)}\n\n`).join(""),
      });
    });
    await page.goto(reviewUrl(reviewServer));
    await page.getByTestId("review-file-feat.ts").click();
    await expect(page.getByTestId("code-col")).toBeFocused();
    await page.keyboard.press("v");
    await page.keyboard.press("u");
    await expect(page.getByTestId("diff-view-unified")).toBeVisible();
    await page.keyboard.press("v");
    await page.keyboard.press("s");
    await expect(page.getByTestId("diff-view-split")).toBeVisible();
    await page.getByTestId("review-file-feat.ts").focus();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("code-col")).toBeFocused();
    await page.keyboard.press("c");
    await page.keyboard.press("Enter");
    await page.getByTestId("comment-composer-input").fill("Keep this note across generation");
    await page.getByTestId("comment-composer-save").click();
    await page.keyboard.press("Escape");
    await page.keyboard.press("2");
    await page.keyboard.press("Control+i");
    await page.getByTestId("settings-api-key").fill("sk-e2e-explicit");
    await page.getByTestId("settings-save").click();
    await expect(page.getByTestId("settings-status")).toHaveText("Saved");
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("settings-modal")).toHaveCount(0);
    await expect(page.getByTestId("generate-review-plan")).toBeVisible();
    expect(calls).toBe(0);
    await page.keyboard.press("Control+i");
    await expect(page.getByTestId("review-unit-1")).toBeVisible();
    await expect(page.getByTestId("error-message")).toContainText("Provider disconnected");
    await page.keyboard.press("1");
    await expect(page.getByTestId("draft-comment")).toHaveCount(1);
    await page.getByTestId("context-panel-retry").click();
    await expect(page.getByTestId("overlay-status-live")).toContainText("Review plan ready");
    await expect(page.getByTestId("navigation-tab-files")).toHaveAttribute("aria-selected", "true");
    await expect(page.getByTestId("diff-file-header")).toContainText("feat.ts");
    await page.getByTestId("submit-review-button").click();
    await expect(page.getByTestId("generate-prompt-text")).toContainText(
      "Keep this note across generation",
    );
    expect(calls).toBe(2);
    await page.keyboard.press("Escape");
    await page.reload();
    await expect(page.getByTestId("navigation-tab-files")).toHaveAttribute("aria-selected", "true");
    await expect(page.getByTestId("draft-comment")).toHaveCount(1);
    expect(calls).toBe(2);
  });

  test("switching scope reloads the overlay diff", async ({ page, reviewServer }) => {
    await page.goto(reviewUrl(reviewServer), { waitUntil: "domcontentloaded" });

    await expect(page.getByTestId("review-file-feat.ts")).toBeVisible();

    await page.getByTestId("review-scope-select").click();
    await page.getByTestId("review-scope-select-option-uncommitted").click();

    await expect(page.getByTestId("review-file-dirty.ts")).toBeVisible();
    await expect(page.getByTestId("review-file-feat.ts")).toHaveCount(0);
  });

  test("stale banner appears and Refresh reloads", async ({ page, reviewServer }) => {
    await page.goto(reviewUrl(reviewServer), { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("navigation-tab-units")).toBeVisible();
    await expect(page.getByTestId("stale-diff-banner")).toHaveCount(0);

    await commitInRepo(reviewServer.repoDir, "feat.ts", "export const n = 2;\n");

    await expect(page.getByTestId("stale-diff-banner")).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("stale-diff-refresh").click();

    await expect(page.getByTestId("navigation-tab-units")).toBeVisible();
    await expect(page.getByTestId("stale-diff-banner")).toHaveCount(0);
  });
});
