import { expect, reviewUrl, test } from "./fixtures";

// Opt-in measurement against the production UI; no machine-dependent timing assertions.
test("large review interaction timings", async ({ page, reviewServer }, testInfo) => {
  test.skip(!process.env.GR_PERF, "Run with GR_PERF=1 and --workers=1");
  const files = Array.from({ length: 80 }, (_, f) => ({
    path: `src/module${f}.ts`,
    status: "added",
    isBinaryOrElided: false,
    hunks: [
      {
        id: `src/module${f}.ts#0`,
        header: "@@ -0,0 +1,300 @@",
        oldStart: 0,
        oldLines: 0,
        newStart: 1,
        newLines: 300,
        lines: Array.from({ length: 300 }, (_, i) => ({
          type: "add",
          newLine: i + 1,
          content: `export const value${i} = computeResult(${f}, ${i});`,
        })),
      },
    ],
  }));
  await page.route("**/api/session", async (route) => {
    const session = await (await route.fetch()).json();
    await route.fulfill({ json: { ...session, diff: { files } } });
  });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Performance.enable");
  const samples: Record<string, number[]> = {};
  async function measure(name: string, action: () => Promise<void>) {
    const before = await cdp.send("Performance.getMetrics");
    await action();
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );
    const after = await cdp.send("Performance.getMetrics");
    const duration = (metrics: typeof before) =>
      metrics.metrics.find((m) => m.name === "TaskDuration")!.value;
    (samples[name] ??= []).push((duration(after) - duration(before)) * 1000);
  }
  await measure("open", async () => {
    await page.goto(reviewUrl(reviewServer));
    await expect(page.getByTestId("diff-view-unified")).toHaveAttribute(
      "data-highlight-state",
      "ready",
    );
  });
  for (let i = 0; i < 5; i++) {
    await measure("navigate", async () => {
      await page.getByTestId(`review-file-src/module${i + 1}.ts`).click();
      await expect(page.getByTestId("diff-file-header")).toContainText(`module${i + 1}.ts`);
      await expect(page.getByTestId("diff-view-unified")).toHaveAttribute(
        "data-highlight-state",
        "ready",
      );
    });
    await measure("scroll", async () => {
      await page.getByTestId("code-col").evaluate(async (element) => {
        for (let j = 0; j < 20; j++) {
          element.scrollTop = j * 100;
          await new Promise((resolve) => requestAnimationFrame(resolve));
        }
      });
    });
    await page.keyboard.press("Control+f");
    await measure("search", async () => {
      await page.getByTestId("diff-search-input").fill("computeResult");
      await expect(page.getByTestId("diff-search-result-line")).toHaveCount(20);
    });
    await page.keyboard.press("Escape");
    await page.getByTestId("code-col").focus();
    await page.keyboard.press("c");
    await measure("select-lines", async () => {
      for (let j = 0; j < 10; j++) await page.keyboard.press("Shift+ArrowDown");
    });
    await page.keyboard.press("Enter");
    await measure("type-note", async () => {
      await page
        .getByTestId("comment-composer-input")
        .pressSequentially("Check the boundary conditions before shipping this change.");
    });
    await page.getByTestId("comment-composer-save").click();
    await page.keyboard.press("Escape");
    await measure("split-view", async () => {
      await page.getByTestId("code-col").focus();
      await page.keyboard.press("v");
      await page.keyboard.press("s");
      await expect(page.getByTestId("diff-view-split")).toHaveAttribute(
        "data-highlight-state",
        "ready",
      );
    });
    await page.keyboard.press("v");
    await page.keyboard.press("u");
    await expect(page.getByTestId("diff-view-unified")).toHaveAttribute(
      "data-highlight-state",
      "ready",
    );
  }
  console.log("PERF " + JSON.stringify(samples));
  await testInfo.attach("interaction-task-ms", {
    body: JSON.stringify(samples, null, 2),
    contentType: "application/json",
  });
});
