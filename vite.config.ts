import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { crx } from "@crxjs/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import manifest from "./manifest.config";

export default defineConfig({
  plugins: [react(), tailwindcss(), crx({ manifest })],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
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
      },
    },
  },
  server: {
    // crxjs needs a fixed port for the dev-server HMR client the manifest points at
    port: 5173,
    strictPort: true,
  },
});
