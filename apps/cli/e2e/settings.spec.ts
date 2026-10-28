import { expect, reviewUrl, test } from "./fixtures";

test.describe("CLI settings", () => {
  test("changing the endpoint preserves the saved model and API key", async ({
    page,
    reviewServer,
  }) => {
    await page.goto(reviewUrl(reviewServer, "settings"), { waitUntil: "domcontentloaded" });

    await expect(page.getByTestId("settings-provider")).toBeVisible();
    await expect(page.getByTestId("settings-model")).toHaveText("Claude Opus 4.8");
    await page.getByTestId("settings-api-key").fill("sk-e2e-aaaa");
    await page.getByTestId("settings-save").click();
    await expect(page.getByTestId("settings-status")).toHaveText("Saved");

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("settings-api-key")).toHaveAttribute("placeholder", /aaaa/);
    await expect(page.getByTestId("settings-api-key")).toHaveValue("");
    await page.getByTestId("settings-advanced").click();
    await page.getByTestId("settings-base-url").fill("https://gateway.example.test/v1");
    await page.getByTestId("settings-save").click();
    await expect(page.getByTestId("settings-status")).toHaveText("Saved");

    await page.reload();
    await expect(page.getByTestId("settings-provider")).toHaveText("Claude (Anthropic)");
    await expect(page.getByTestId("settings-model")).toHaveText("Claude Opus 4.8");
    await expect(page.getByTestId("settings-api-key")).toHaveAttribute("placeholder", /aaaa/);
    await expect(page.getByTestId("settings-base-url")).toHaveValue(
      "https://gateway.example.test/v1",
    );
  });

  test("Settings and About navigate via hash and the action palette", async ({
    page,
    reviewServer,
  }) => {
    await page.goto(reviewUrl(reviewServer, "settings"), { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("settings-provider")).toBeVisible();

    await page.getByTestId("settings-api-key").focus();
    await page.keyboard.press("Meta+k");
    await expect(page.getByTestId("command-palette-input")).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(page.getByTestId("command-palette-close")).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByTestId("command-palette-input")).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("command-palette")).toHaveCount(0);
    await expect(page.getByTestId("settings-api-key")).toBeFocused();
    await expect(page).toHaveURL(/#settings/);

    await page.getByTestId("settings-open-command-palette").click();
    await page.getByTestId("command-palette-input").fill("about");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#about/);
    await expect(page.getByTestId("settings-modal")).toBeVisible();

    await page.keyboard.press("Control+k");
    await page.getByTestId("command-action-settings").click();
    await expect(page).toHaveURL(/#settings/);
    await expect(page.getByTestId("settings-provider")).toBeVisible();

    await page.getByTestId("settings-api-key").fill("unsaved-key");
    await page.keyboard.press("Control+k");
    await page.getByTestId("command-action-back-to-review").click();
    await expect(page.getByTestId("confirmation-dialog")).toBeVisible();
    await page.getByTestId("confirmation-cancel").click();
    await expect(page.getByTestId("settings-api-key")).toHaveValue("unsaved-key");

    await page.keyboard.press("Escape");
    await page.getByTestId("confirmation-ok").click();
    await expect(page.getByTestId("settings-modal")).toHaveCount(0);
    await expect(page.getByTestId("navigation-tab-units")).toBeVisible();
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
