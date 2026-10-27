import { expect, reviewUrl, test } from "./fixtures";

test.describe("CLI settings", () => {
  test("saves an API key and keeps it after reload", async ({ page, reviewServer }) => {
    await page.goto(reviewUrl(reviewServer, "settings"), { waitUntil: "domcontentloaded" });

    await expect(page.getByTestId("settings-provider")).toBeVisible();
    await page.getByTestId("settings-api-key").fill("sk-e2e-aaaa");
    await page.getByTestId("settings-save").click();
    await expect(page.getByTestId("settings-status")).toHaveText("Saved");

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("settings-api-key")).toHaveAttribute("placeholder", /aaaa/);
  });

  test("Settings and About navigate via hash", async ({ page, reviewServer }) => {
    await page.goto(reviewUrl(reviewServer, "settings"), { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("settings-provider")).toBeVisible();

    await page.getByTestId("settings-nav-about").click();
    await expect(page).toHaveURL(/#about/);
    await expect(page.getByTestId("settings-modal")).toBeVisible();

    await page.getByTestId("settings-nav-settings").click();
    await expect(page).toHaveURL(/#settings/);
    await expect(page.getByTestId("settings-provider")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByTestId("settings-modal")).toHaveCount(0);
    await expect(page.getByTestId("review-plan-invitation-action")).toBeVisible();
  });
});

// Exercise the real settings persistence with both a new and an older model.
for (const [providerId, defaultLabel, newId, newLabel, olderId, olderLabel] of [
  [
    "anthropic",
    "Claude Haiku 5.5",
    "claude-opus-5-5",
    "Claude Opus 5.5",
    "claude-opus-4-8",
    "Claude Opus 4.8",
  ],
  ["openai", "GPT-6 Luna", "gpt-6-astra", "GPT-6 Astra", "gpt-4.1", "GPT-4.1"],
  ["grok", "Grok 4.7", "grok-4.3", "Grok 4.3", "grok-4", "Grok 4"],
] as const) {
  test(`selects and persists new and older models for ${defaultLabel}`, async ({
    page,
    reviewServer,
  }) => {
    await page.goto(reviewUrl(reviewServer, "settings"));
    const provider = page.getByTestId("settings-provider");
    await expect(provider).toBeVisible();
    // Switch away first so this also tests the default for the initial provider.
    for (const id of [providerId === "openai" ? "grok" : "openai", providerId]) {
      await provider.click();
      await page.getByTestId(`settings-provider-option-${id}`).click();
    }
    const model = page.getByTestId("settings-model");
    await expect(model).toHaveText(defaultLabel);
    await page.getByTestId("settings-api-key").fill("sk-model-test");

    for (const [id, label] of [
      [newId, newLabel],
      [olderId, olderLabel],
    ] as const) {
      await model.click();
      await page.getByTestId(`settings-model-option-${id}`).click();
      await expect(model).toHaveText(label);
      await page.getByTestId("settings-save").click();
      await expect(page.getByTestId("settings-status")).toHaveText("Saved");
      await page.reload();
      await expect(model).toHaveText(label);
    }
  });
}
