import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

const shared = {
  plugins: [react()],
};

export default defineConfig({
  ...shared,
  test: {
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    pool: "threads",
    maxWorkers: process.env.CI ? 2 : undefined,
    projects: [
      {
        ...shared,
        test: {
          name: "unit",
          environment: "node",
          globals: true,
          setupFiles: ["./src/test/setup.ts"],
          include: ["src/**/*.test.ts"],
        },
      },
      {
        ...shared,
        test: {
          name: "dom",
          environment: "jsdom",
          globals: true,
          setupFiles: ["./src/test/setup.ts"],
          include: ["src/**/*.test.tsx"],
        },
      },
    ],
  },
});
