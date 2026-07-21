import { test as base, chromium, type BrowserContext, type Worker } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXTENSION_PATH = path.resolve(__dirname, "../dist");

interface ExtensionFixtures {
  context: BrowserContext;
  extensionId: string;
}

/**
 * Standard Playwright pattern for testing a Chrome MV3 extension: extensions can only be
 * loaded into a *persistent* context (not the regular `browser.newContext()` API), and the
 * extension's id is only known once its service worker has registered. Requires `dist/` to
 * exist — run `npm run build` first (wired up as `pretest:e2e`).
 */
export const test = base.extend<ExtensionFixtures>({
  // eslint-disable-next-line no-empty-pattern
  context: async ({}, use) => {
    const context = await chromium.launchPersistentContext("", {
      channel: "chromium",
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
        // Extensions only load in Chromium's "new" headless mode.
        "--headless=new",
      ],
    });
    await use(context);
    await context.close();
  },

  extensionId: async ({ context }, use) => {
    let [worker] = context.serviceWorkers() as Worker[];
    if (!worker) {
      worker = await context.waitForEvent("serviceworker");
    }
    const extensionId = new URL(worker.url()).host;
    await use(extensionId);
  },
});

export const expect = test.expect;
