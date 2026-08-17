import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    pool: "threads",
    maxWorkers: process.env.CI ? 2 : undefined,
    include: ["src/**/*.test.ts"],
  },
});
