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

    await expect(page.getByRole("combobox", { name: "Provider" })).toContainText(
      "Claude (Anthropic)",
    );

    await page.getByLabel("API key").fill("sk-e2e-test-key");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Saved")).toBeVisible();

    await page.getByRole("button", { name: "Test connection" }).click();
    await expect(page.getByText("Connection works")).toBeVisible();

    // Reload to prove the settings round-tripped through the real chrome.storage.local,
    // not just in-memory component state.
    await page.reload();
    await expect(page.getByLabel("API key")).toHaveValue("sk-e2e-test-key");
    await expect(page.getByRole("combobox", { name: "Provider" })).toContainText(
      "Claude (Anthropic)",
    );
  });

  test("switching provider resets the model to that provider's default", async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/src/options/index.html`);

    await expect(page.getByRole("combobox", { name: "Provider" })).toContainText(
      "Claude (Anthropic)",
    );

    await page.getByRole("combobox", { name: "Provider" }).click();
    await page.getByRole("option", { name: /Grok/ }).click();

    await expect(page.getByRole("combobox", { name: "Model" })).toContainText("Grok 4");
  });

  test("navigates to About from Settings and back", async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/src/options/index.html`);

    await page.getByRole("link", { name: /about guided review/i }).click();
    await expect(page.getByRole("heading", { name: "What it does" })).toBeVisible();
    await expect(page).toHaveURL(/#about$/);
    await expect(page).toHaveTitle(/About/);

    await page.getByRole("link", { name: /settings/i }).click();
    await expect(page.getByRole("combobox", { name: "Provider" })).toBeVisible();
    await expect(page).toHaveURL(/#settings$/);
  });
});

