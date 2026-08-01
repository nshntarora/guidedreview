import { expect, test } from "./fixtures";

test.describe("Welcome page", () => {
  test("renders the first-install path and primary CTA", async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/src/welcome/index.html`);

    await expect(page.getByRole("heading", { name: "Welcome" })).toBeVisible();
    await expect(page.getByText(/Here's how to get started/i)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Pin the extension" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Connect an AI provider" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Start a review on a PR" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Connect AI provider/i })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Product links" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Website" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Docs" })).toBeVisible();
    await expect(page.getByRole("link", { name: "GitHub", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Privacy" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Terms" })).toBeVisible();
  });

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
