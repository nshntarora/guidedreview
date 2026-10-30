import { commitInRepo, expect, reviewUrl, test } from "./fixtures";

test.describe("CLI review overlay", () => {
  test("progressive multi-file units preserve reading position and search into later cards", async ({
    page,
    reviewServer,
  }) => {
    let sessionKey = "";
    const files = ["one.ts", "two.ts", "three.ts", "four.ts"].map((path) => ({
      path,
      status: "added",
      isBinaryOrElided: false,
      hunks: [
        {
          id: `${path}#0`,
          header: "@@ -0,0 +1,100 @@",
          oldStart: 0,
          oldLines: 0,
          newStart: 1,
          newLines: 100,
          lines: Array.from({ length: 100 }, (_, i) => ({
            type: "add",
            newLine: i + 1,
            content: `export const value${i} = ${i};`,
          })),
        },
      ],
    }));
    const plan = {
      units: [
        {
          id: "multi",
          title: "Three files",
          kind: "change",
          context: "Related changes",
          files: ["two.ts", "one.ts", "three.ts"].map((fileId) => ({
            fileId,
            hunkIds: [],
            role: "core_logic",
          })),
        },
        {
          id: "single",
          title: "Fourth file",
          kind: "change",
          context: "Separate change",
          files: [{ fileId: "four.ts", hunkIds: [], role: "core_logic" }],
        },
      ],
    };
    await page.route("**/api/session", async (route) => {
      const session = await (await route.fetch()).json();
      sessionKey = session.sessionKey;
      await route.fulfill({
        json: { ...session, diff: { files }, settings: { ...session.settings, hasKey: true } },
      });
    });
    await page.route("**/api/plan", (route) =>
      route.fulfill({
        contentType: "text/event-stream",
        body: `data: ${JSON.stringify({ type: "DONE", plan })}\n\n`,
      }),
    );
    await page.goto(reviewUrl(reviewServer));
    await page.getByTestId("navigation-tab-units").click();
    await page.getByTestId("generate-review-plan").click();
    await expect(page.getByTestId("review-unit-1")).toBeVisible();

    const mounts: { names: string[]; frame: number; highlighted: boolean }[] = [];
    page.on("console", (message) => {
      if (message.text().startsWith("card-mount:"))
        mounts.push(JSON.parse(message.text().slice(11)));
    });
    await page.evaluate(() => {
      let frame = 0;
      let raf = 0;
      let count = 0;
      const tick = () => {
        frame++;
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      const observer = new MutationObserver(() => {
        const column = document.querySelector('[data-testid="code-col"]')!;
        if (column.querySelector('[data-testid="diff-unit-title"]')?.textContent !== "Three files")
          return;
        const cards = [...column.querySelectorAll('[data-testid="diff-file-header"]')];
        if (cards.length === count) return;
        count = cards.length;
        console.debug(
          "card-mount:" +
            JSON.stringify({
              names: cards.map((card) => card.textContent?.match(/\w+\.ts/)?.[0]),
              frame,
              highlighted:
                column
                  .querySelectorAll('[data-testid="diff-view-unified"]')
                  [count - 1]?.getAttribute("data-highlight-state") === "ready",
            }),
        );
        if (count === 3) {
          observer.disconnect();
          cancelAnimationFrame(raf);
        }
      });
      observer.observe(document.querySelector('[data-testid="code-col"]')!, {
        childList: true,
        subtree: true,
      });
    });
    await page.getByTestId("review-unit-1").click();
    await expect(page.getByTestId("diff-file-header")).toHaveCount(3);
    await expect.poll(() => mounts.length).toBe(3);
    expect(mounts.map((mount) => mount.names)).toEqual([
      ["two.ts"],
      ["two.ts", "one.ts"],
      ["two.ts", "one.ts", "three.ts"],
    ]);
    expect(mounts.every((mount) => !mount.highlighted)).toBe(true);
    expect(mounts[1].frame).toBeGreaterThan(mounts[0].frame);
    expect(mounts[2].frame).toBeGreaterThan(mounts[1].frame);
    await page.getByTestId("code-col").evaluate((column) => {
      column.scrollTop = column.scrollHeight;
    });
    await expect(page.getByTestId("diff-view-unified").last()).toHaveAttribute(
      "data-highlight-state",
      "ready",
    );
    await expect
      .poll(() =>
        page.evaluate(
          (key) =>
            JSON.parse(sessionStorage.getItem(`guidedReview.session.${key}`) ?? "{}")
              .scrollPositions?.["unit:multi"] ?? 0,
          sessionKey,
        ),
      )
      .toBeGreaterThan(4000);
    const savedTop = await page.getByTestId("code-col").evaluate((column) => column.scrollTop);
    await page.getByTestId("review-unit-2").click();
    await page.getByTestId("review-unit-1").click();
    await expect
      .poll(() => page.getByTestId("code-col").evaluate((column) => column.scrollTop))
      .toBeCloseTo(savedTop, 0);

    await page.getByTestId("review-unit-2").click();
    await page.keyboard.press("Control+f");
    await page.getByTestId("diff-search-input").fill("three.ts");
    await page.getByTestId("diff-search-result-file").first().click();
    await expect(
      page.getByTestId("diff-file-search-highlight").getByTestId("diff-file-header"),
    ).toContainText("three.ts");
    await expect(page.getByTestId("code-col")).toBeFocused();
  });

  test("command palette and search preserve an unfinished line note", async ({
    page,
    reviewServer,
  }) => {
    await page.goto(reviewUrl(reviewServer));
    await page.getByTestId("review-file-feat.ts").click();
    await page.keyboard.press("c");
    await page.keyboard.press("Enter");
    const composer = page.getByTestId("comment-composer-input");
    await composer.fill("Check the boundary before shipping");

    await page.keyboard.press("Control+k");
    await expect(page.getByTestId("command-palette-input")).toBeFocused();
    await page.getByTestId("command-action-view-mode").click();
    await expect(page.getByTestId("command-palette-input")).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(composer).toBeFocused();
    await expect(composer).toHaveValue("Check the boundary before shipping");

    await page.keyboard.press("Meta+f");
    const search = page.getByTestId("diff-search-input");
    await expect(search).toBeFocused();
    await search.fill("export const n");
    await page.keyboard.press("Tab");
    await expect(page.getByTestId("command-palette-back")).toBeFocused();
    await page.keyboard.press("Control+f");
    await expect(search).toBeFocused();
    await expect(search).toHaveValue("export const n");
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("command-palette")).toHaveCount(0);
    await expect(composer).toBeFocused();
    await expect(composer).toHaveValue("Check the boundary before shipping");

    await page.getByTestId("comment-composer-save").click();
    await expect(page.getByTestId("draft-comment-body")).toHaveText(
      "Check the boundary before shipping",
    );
  });

  test("copies edited notes into a prompt and excludes removed drafts", async ({
    page,
    context,
    reviewServer,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"], {
      origin: reviewServer.baseURL,
    });
    await page.goto(reviewUrl(reviewServer));
    await page.getByTestId("review-file-feat.ts").click();
    await page.keyboard.press("c");
    await page.keyboard.press("Enter");
    await page.getByTestId("comment-composer-input").fill("Original note");
    await page.getByTestId("comment-composer-save").click();
    await page.keyboard.press("Escape");

    await page.getByTestId("draft-comment-edit").click();
    await page.getByTestId("draft-comment-edit-input").fill("Add a boundary test for n.");
    await page.getByTestId("draft-comment-edit-save").click();
    await expect(page.getByTestId("draft-comment-body")).toHaveText("Add a boundary test for n.");

    await page.getByTestId("code-col").focus();
    await page.keyboard.press("c");
    await page.keyboard.press("Enter");
    await page.getByTestId("comment-composer-input").fill("Discard this note");
    await page.getByTestId("comment-composer-save").click();
    await page.keyboard.press("Escape");
    const drafts = page.getByTestId("draft-comment");
    await expect(drafts).toHaveCount(2);
    await drafts.last().getByTestId("draft-comment-remove").click();
    await page.getByTestId("confirmation-ok").click();
    await expect(drafts).toHaveCount(1);

    await page.keyboard.press("Control+k");
    await page.getByTestId("command-action-generate-prompt").click();
    const prompt = page.getByTestId("generate-prompt-text");
    await expect(prompt).toContainText("feat.ts");
    await expect(prompt).toContainText("Add a boundary test for n.");
    await expect(prompt).not.toContainText("Original note");
    await expect(prompt).not.toContainText("Discard this note");
    await page.getByTestId("generate-prompt-copy").click();
    await expect
      .poll(() => page.evaluate(() => navigator.clipboard.readText()))
      .toBe(await prompt.innerText());
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("generate-prompt-modal")).toHaveCount(0);
    await expect(page.getByTestId("submit-review-button")).toBeFocused();
    await page.reload();
    await expect(page.getByTestId("draft-comment-body")).toHaveText("Add a boundary test for n.");
  });

  test("boots a file-by-file review", async ({ page, reviewServer }) => {
    await page.goto(reviewUrl(reviewServer), { waitUntil: "domcontentloaded" });

    await expect(page.getByTestId("review-summary")).toHaveCount(0);
    await expect(page.getByTestId("description-pane")).toHaveCount(0);
    await expect(page.getByTestId("diff-file-header")).toContainText("feat.ts");
    await expect(page.getByTestId("review-previous-unit")).toBeDisabled();
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

  test("provider setup and the action palette both open settings", async ({
    page,
    reviewServer,
  }) => {
    await page.goto(reviewUrl(reviewServer), { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("navigation-tab-units")).toBeVisible();

    await page.getByTestId("navigation-tab-units").click();
    await page.getByTestId("connect-provider-open-settings").click();

    await expect(page).toHaveURL(/#settings/);
    await expect(page.getByTestId("settings-modal")).toBeVisible();
    await expect(page.getByTestId("settings-provider")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("settings-modal")).toHaveCount(0);
    await page.keyboard.press("Control+k");
    await page.getByTestId("command-action-settings").click();
    await expect(page.getByTestId("settings-modal")).toBeVisible();
    await expect(page.getByTestId("command-palette")).toHaveCount(0);
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
              {
                type: "USAGE",
                usage: {
                  inputTokens: 1200,
                  outputTokens: 42,
                  inputEstimated: true,
                  outputEstimated: true,
                },
              },
              { type: "UNIT", unit },
              {
                type: "ERROR",
                error: { message: "Provider disconnected. Retry the review plan." },
              },
            ]
          : [
              {
                type: "USAGE",
                usage: {
                  inputTokens: 1234,
                  outputTokens: 321,
                  inputEstimated: false,
                  outputEstimated: false,
                },
              },
              { type: "DONE", plan: { units: [unit] } },
            ];
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
    await expect(page.getByTestId("review-output-tokens")).toHaveText("≈42");
    await page.keyboard.press("1");
    await expect(page.getByTestId("draft-comment")).toHaveCount(1);
    await page.getByTestId("context-panel-retry").click();
    await expect(page.getByTestId("overlay-status-live")).toContainText("Review plan ready");
    await expect(page.getByTestId("navigation-tab-files")).toHaveAttribute("aria-selected", "true");
    await expect(page.getByTestId("diff-file-header")).toContainText("feat.ts");
    await page.getByTestId("navigation-tab-units").click();
    await expect(page.getByTestId("review-input-tokens")).toHaveText("1,234");
    await expect(page.getByTestId("review-output-tokens")).toHaveText("321");
    await page.getByTestId("navigation-tab-files").click();
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
    await page.getByTestId("navigation-tab-units").click();
    await expect(page.getByTestId("review-input-tokens")).toHaveText("1,234");
    await expect(page.getByTestId("review-output-tokens")).toHaveText("321");
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
