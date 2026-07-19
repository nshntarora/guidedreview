import { defineManifest } from "@crxjs/vite-plugin";
import pkg from "./package.json";

export default defineManifest({
  manifest_version: 3,
  name: "Guided PR Review",
  description:
    "Turns a GitHub pull request diff into a guided, AI-structured review: model changes first, grouped by concern, with context and risk flags.",
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
      matches: ["https://github.com/*/*/pull/*"],
      js: ["src/content/index.tsx"],
      run_at: "document_idle",
    },
  ],
  options_page: "src/options/index.html",
  action: {},
});
