import { defineConfig } from "@playwright/test";

// Extensions can only be loaded in a persistent context (see e2e/fixtures.ts), so there is
// no `use.headless` toggle here — headedness is controlled by the `launchPersistentContext`
// call itself, via Chromium's "new" headless mode (which, unlike old headless, supports
// loading extensions).
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false, // each test drives its own persistent browser context; keep runs simple/serial
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  timeout: 30_000,
  use: {
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
});
