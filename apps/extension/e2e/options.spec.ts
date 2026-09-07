import { expect, test } from "./fixtures";

test.describe("Options page", () => {
  test("saves provider settings and persists them across a reload", async ({
    context,
    extensionId,
  }) => {
    // Stub the provider "test connection" call so it's deterministic and makes no real
    // network request — the assertion here is about storage persistence, not the provider.
    await context.route("https://api.anthropic.com/v1/messages", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ content: [{ type: "text", text: "{}" }] }),
      }),
    );

    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/src/options/index.html`);

    await expect(page.getByTestId("settings-provider")).toContainText("Claude (Anthropic)");

    await page.getByTestId("settings-api-key").fill("sk-e2e-test-key");
    await page.getByTestId("settings-save").click();
    await expect(page.getByTestId("settings-status")).toHaveText("Saved");

    await page.getByTestId("settings-test-connection").click();
    await expect(page.getByTestId("settings-status")).toHaveText("Connection OK");

    // Reload to prove the settings round-tripped through the real chrome.storage.local,
    // not just in-memory component state.
    await page.reload();
    await expect(page.getByTestId("settings-api-key")).toHaveValue("sk-e2e-test-key");
    await expect(page.getByTestId("settings-provider")).toContainText("Claude (Anthropic)");
  });

  test("switching provider resets the model to that provider's default", async ({
    context,
    extensionId,
  }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/src/options/index.html`);

    await expect(page.getByTestId("settings-provider")).toContainText("Claude (Anthropic)");

    await page.getByTestId("settings-provider").click();
    await page.getByTestId("settings-provider").press("End");
    await page.getByTestId("settings-provider").press("Enter");

    await expect(page.getByTestId("settings-model")).toContainText("Grok 4");
  });

  test("navigates to About from Settings and back", async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/src/options/index.html`);

    await page.getByTestId("options-nav-about").click();
    await expect(page.getByTestId("options-nav")).toBeVisible();
    await expect(page).toHaveURL(/#about$/);
    await expect(page).toHaveTitle(/About/);

    await page.getByTestId("options-nav-settings").click();
    await expect(page.getByTestId("settings-provider")).toBeVisible();
    await expect(page).toHaveURL(/#settings$/);
  });

  test("auto-open on Files changed persists across a reload", async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/src/options/index.html`);

    const toggle = page.getByTestId("settings-auto-open");
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute("aria-checked", "false");

    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-checked", "true");

    await page.reload();
    await expect(page.getByTestId("settings-auto-open")).toHaveAttribute("aria-checked", "true");
  });
});
