/// <reference types="vitest" />

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import svgr from "vite-plugin-svgr";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), svgr()],
  optimizeDeps: {
    include: ["react-icons/hi"],
  },
  resolve: {
    alias: {
      "@": "/src",
      "@components": "/src/components",
      "@context": "/src/context",
      "@hooks": "/src/hooks",
      "@services": "/src/services",
      "@types": "/src/types",
      "@utils": "/src/utils",
    },
  },
  build: {
    rollupOptions: {
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
    include: ["test/**/*.test.ts"],
    globals: false,
    environment: "happy-dom",
  },
});
