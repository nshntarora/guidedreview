import { expect, test } from "./fixtures";

test.describe("Popup", () => {
  test("Settings opens the options page", async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/src/popup/index.html`);
    await expect(page.getByTestId("popup-message")).toBeVisible();

    const optionsPromise = context.waitForEvent("page", {
      predicate: (p) => p.url().includes("/src/options/"),
    });
    await page.getByTestId("popup-settings").click();
    const optionsPage = await optionsPromise;

    await expect(optionsPage).toHaveURL(
      new RegExp(`chrome-extension://${extensionId}/src/options/`),
    );
    await expect(optionsPage.getByTestId("settings-provider")).toBeVisible();
  });

  test("About opens options with the #about hash", async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/src/popup/index.html`);
    await expect(page.getByTestId("popup-message")).toBeVisible();

    const aboutPromise = context.waitForEvent("page", {
      predicate: (p) => p.url().includes("/src/options/") && p.url().includes("#about"),
    });
    await page.getByTestId("popup-about").click();
    const aboutPage = await aboutPromise;

    await expect(aboutPage).toHaveURL(/#about$/);
    await expect(aboutPage.getByTestId("options-nav")).toBeVisible();
  });
});
