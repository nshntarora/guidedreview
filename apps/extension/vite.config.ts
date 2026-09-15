import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { crx } from "@crxjs/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import manifest from "./manifest.config";

// Monorepo root holds .env / .env.example (VITE_GITHUB_CLIENT_ID, etc.).
// Vite defaults to the config file directory (apps/extension), which has no .env.
const envDir = path.resolve(__dirname, "../..");

export default defineConfig(({ command, mode }) => {
  const githubClientId = loadEnv(mode, envDir, "VITE_GITHUB_CLIENT_ID").VITE_GITHUB_CLIENT_ID;

  if (command === "build" && !githubClientId?.trim()) {
    throw new Error(
      "VITE_GITHUB_CLIENT_ID must be set to build the Chrome extension. Add it to the root .env file or provide it in the build environment.",
    );
  }

  return {
    envDir,
    plugins: [react(), tailwindcss(), crx({ manifest })],
    resolve: {
      alias: {
        "@extension": path.resolve(__dirname, "./src"),
      },
      dedupe: ["react", "react-dom"],
    },
    css: {
      preprocessorOptions: {
        scss: {
          api: "modern-compiler",
        },
      },
    },
    build: {
      outDir: "dist",
      emptyOutDir: true,
      rollupOptions: {
        input: {
          options: path.resolve(__dirname, "src/options/index.html"),
          popup: path.resolve(__dirname, "src/popup/index.html"),
          welcome: path.resolve(__dirname, "src/welcome/index.html"),
        },
      },
    },
    server: {
      // crxjs needs a fixed port for the dev-server HMR client the manifest points at
      port: 5173,
      strictPort: true,
    },
  };
});
