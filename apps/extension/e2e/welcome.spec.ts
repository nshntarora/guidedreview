import { expect, test } from "./fixtures";

test.describe("Welcome page", () => {
  test("Connect AI provider opens the options page", async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/src/welcome/index.html`);

    // openOptionsPage can emit an intermediate blank page; wait for the real options URL.
    const optionsPromise = context.waitForEvent("page", {
      predicate: (p) => p.url().includes("/src/options/"),
    });
    await page.getByTestId("welcome-connect-provider").click();
    const optionsPage = await optionsPromise;

    await expect(optionsPage).toHaveURL(
      new RegExp(`chrome-extension://${extensionId}/src/options/`),
    );
    await expect(optionsPage.getByRole("heading", { name: "Settings" })).toBeVisible();
    await expect(optionsPage.getByRole("combobox", { name: "Provider" })).toBeVisible();
  });
});
