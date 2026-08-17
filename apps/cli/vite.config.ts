import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  root: path.resolve(__dirname, "src/ui"),
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@extension": path.resolve(__dirname, "../extension/src"),
      "@cli": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom"],
  },
  publicDir: path.resolve(__dirname, "public"),
  build: {
    outDir: path.resolve(__dirname, "dist/ui"),
    emptyOutDir: true,
  },
  server: {
    port: 5174,
    proxy: {
      "/api": "http://127.0.0.1:8787",
    },
  },
});
