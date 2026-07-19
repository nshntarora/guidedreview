import { expect, test } from "./fixtures";

test.describe("Options page", () => {
  test("saves provider settings and persists them across a reload", async ({ context, extensionId }) => {
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

    await expect(page.getByLabel("Provider")).toHaveValue("anthropic");

    await page.getByLabel("API key").fill("sk-e2e-test-key");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Saved")).toBeVisible();

    await page.getByRole("button", { name: "Test connection" }).click();
    await expect(page.getByText("Connection works")).toBeVisible();

    // Reload to prove the settings round-tripped through the real chrome.storage.local,
    // not just in-memory component state.
    await page.reload();
    await expect(page.getByLabel("API key")).toHaveValue("sk-e2e-test-key");
    await expect(page.getByLabel("Provider")).toHaveValue("anthropic");
  });

  test("switching provider resets the model to that provider's default", async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/src/options/index.html`);

    await expect(page.getByLabel("Provider")).toHaveValue("anthropic");
    await page.getByLabel("Provider").selectOption("grok");

    await expect(page.getByLabel("Model")).toHaveValue("grok-4");
  });
});
