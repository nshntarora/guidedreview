import { defineManifest } from "@crxjs/vite-plugin";
import pkg from "./package.json";

export default defineManifest({
  manifest_version: 3,
  name: "Guided Review",
  // Chrome caps description at 132 characters (browser load + Web Store).
  // Keep in sync with the short description in store-listing.md.
  description:
    "A better way for humans to review AI generated code — clustered changes, summaries, and a keyboard-first overlay on GitHub.",
  version: pkg.version,
  icons: {
    16: "public/icons/icon16.png",
    48: "public/icons/icon48.png",
    128: "public/icons/icon128.png",
  },
  permissions: ["storage", "activeTab"],
  host_permissions: [
    "https://github.com/*",
    "https://patch-diff.githubusercontent.com/*",
    "https://api.github.com/*",
    "https://api.anthropic.com/*",
    "https://api.openai.com/*",
    "https://api.x.ai/*",
  ],
  background: {
    service_worker: "src/background/index.ts",
    type: "module",
  },
  content_scripts: [
    {
      // Match all of github.com so the content script (and its MutationObserver)
      // is already running when the user SPA-navigates from e.g. the PR list into
      // a PR. UI is only injected when parsePRUrl matches a PR path.
      matches: ["https://github.com/*"],
      js: ["src/content/index.tsx"],
      run_at: "document_idle",
    },
  ],
  options_page: "src/options/index.html",
  action: {
    // With a popup, chrome.action.onClicked does not fire — the popup handles
    // icon clicks (start review on PR pages, otherwise show a short message).
    default_popup: "src/popup/index.html",
  },
  web_accessible_resources: [
    {
      resources: ["logomark.svg"],
      matches: ["https://github.com/*"],
    },
  ],
});
