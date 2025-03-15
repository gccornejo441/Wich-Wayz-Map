/// <reference types="vitest" />

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import svgr from "vite-plugin-svgr";
import { resolve } from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), svgr()],
  optimizeDeps: {
    include: ["react-icons/hi"],
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      "@components": resolve(__dirname, "./src/components"),
      "@context": resolve(__dirname, "./src/context"),
      "@constants": resolve(__dirname, "./src/constants"),
      "@hooks": resolve(__dirname, "./src/hooks"),
      "@services": resolve(__dirname, "./src/services"),
      "@types": resolve(__dirname, "./src/types"),
      "@utils": resolve(__dirname, "./src/utils"),
      "@models": resolve(__dirname, "./src/models"),
    },
  },
  build: {
    rollupOptions: {
      external: ["yup"],
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom"],
          "leaflet-vendor": ["leaflet", "react-leaflet"],
          "axios-idb": ["axios", "idb"],
        },
      },
    },
  },
  test: {
    include: ["test/**/*.test.ts", "test/**/*.test.tsx"],
    globals: true,
    environment: "happy-dom",
    setupFiles: "./test/setupTests.ts",
  },
});
