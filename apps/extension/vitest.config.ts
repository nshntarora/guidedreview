import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

// Deliberately a separate config from vite.config.ts rather than merging: the
// crx plugin there rewrites the manifest/output structure for the extension
// build and has no meaning under Vitest's Node/jsdom test runner.
//
// Two projects split environments: pure unit tests stay on node (cheap),
// React/DOM tests use jsdom. On CI this cut environment time from ~32s of the
// wall clock when everything used jsdom under low parallelism.
const shared = {
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
};

const domTestTs = [
  "src/content/buttonAnchor.test.ts",
  "src/content/overlay/focusTrap.test.ts",
  "src/content/overlay/prConversationUrl.test.ts",
  "src/lib/github/prContext.test.ts",
  "src/popup/main.test.ts",
];

export default defineConfig({
  ...shared,
  test: {
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    // GitHub-hosted runners are 2-core; pin workers so file parallelism is reliable in CI.
    pool: "threads",
    maxWorkers: process.env.CI ? 2 : undefined,
    exclude: ["e2e/**", "node_modules/**", "dist/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.test.{ts,tsx}", "src/test/**", "src/options/index.html"],
    },
    projects: [
      {
        ...shared,
        test: {
          name: "unit",
          environment: "node",
          globals: true,
          setupFiles: ["./src/test/setup.ts"],
          include: ["src/**/*.test.ts"],
          exclude: ["e2e/**", "node_modules/**", "dist/**", ...domTestTs],
        },
      },
      {
        ...shared,
        test: {
          name: "dom",
          environment: "jsdom",
          globals: true,
          setupFiles: ["./src/test/setup.ts"],
          include: ["src/**/*.test.tsx", ...domTestTs],
          exclude: ["e2e/**", "node_modules/**", "dist/**"],
        },
      },
    ],
  },
});
