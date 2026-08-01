import { expect, test } from "./fixtures";

test.describe("Popup", () => {
  test("shows not-on-PR message and Settings/About links", async ({ context, extensionId }) => {
    // Popup reads the active tab via chrome.tabs.query. Opening the popup HTML
    // as the focused page means the active tab is not a GitHub PR URL, so the
    // popup should render its idle message instead of starting a review.
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/src/popup/index.html`);

    await expect(page.locator("#root")).toBeVisible();
    await expect(page.locator("#message")).toHaveText(
      /Open a GitHub pull request page to start a review/i,
    );

    await expect(page.getByRole("navigation", { name: "Extension pages" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Settings" })).toBeVisible();
    await expect(page.getByRole("link", { name: "About" })).toBeVisible();
  });

  test("Settings opens the options page", async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/src/popup/index.html`);
    await expect(page.locator("#message")).toBeVisible();

    const optionsPromise = context.waitForEvent("page", {
      predicate: (p) => p.url().includes("/src/options/"),
    });
    await page.getByRole("link", { name: "Settings" }).click();
    const optionsPage = await optionsPromise;

    await expect(optionsPage).toHaveURL(
      new RegExp(`chrome-extension://${extensionId}/src/options/`),
    );
    await expect(optionsPage.getByRole("combobox", { name: "Provider" })).toBeVisible();
  });

  test("About opens options with the #about hash", async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/src/popup/index.html`);
    await expect(page.locator("#message")).toBeVisible();

    const aboutPromise = context.waitForEvent("page", {
      predicate: (p) => p.url().includes("/src/options/") && p.url().includes("#about"),
    });
    await page.getByRole("link", { name: "About" }).click();
    const aboutPage = await aboutPromise;

    await expect(aboutPage).toHaveURL(/#about$/);
    await expect(aboutPage.getByRole("heading", { name: "How it works" })).toBeVisible();
  });
});
