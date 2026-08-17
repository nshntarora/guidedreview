import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
    pool: "threads",
    maxWorkers: process.env.CI ? 2 : undefined,
  },
  resolve: {
    alias: {
      "@extension": path.resolve(__dirname, "../extension/src"),
      "@cli": path.resolve(__dirname, "./src"),
    },
  },
});
