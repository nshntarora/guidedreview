import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

const shared = {
  plugins: [react()],
  resolve: {
    alias: {
      "@extension": path.resolve(__dirname, "../extension/src"),
    },
  },
};

export default defineConfig({
  ...shared,
  test: {
    globals: true,
    pool: "threads",
    maxWorkers: process.env.CI ? 2 : undefined,
    setupFiles: ["./src/ui/test/setup.ts"],
    projects: [
      {
        ...shared,
        test: {
          name: "unit",
          environment: "node",
          globals: true,
          include: ["src/**/*.test.ts"],
          exclude: ["src/ui/**"],
        },
      },
      {
        ...shared,
        test: {
          name: "dom",
          environment: "jsdom",
          globals: true,
          setupFiles: ["./src/ui/test/setup.ts"],
          include: ["src/ui/**/*.test.ts", "src/ui/**/*.test.tsx"],
        },
      },
    ],
  },
});
