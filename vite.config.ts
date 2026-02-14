/// <reference types="vitest" />

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import svgr from "vite-plugin-svgr";
import { VitePWA } from "vite-plugin-pwa";
import { resolve } from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    svgr(),
    VitePWA({
      strategies: "generateSW",
      registerType: "prompt",
      injectRegister: "auto",
      filename: "sw.js",
      manifestFilename: "site.webmanifest",
      includeAssets: [
        "favicon.ico",
        "favicon.svg",
        "apple-touch-icon.png",
        "android-chrome-192x192.png",
        "android-chrome-512x512.png",
        "maskable-icon-512x512.png",
        "Wich-Wayz-Logo.svg",
        "sandwich-pin-v2.svg",
      ],
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /^\/api\//,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              networkTimeoutSeconds: 8,
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api/],
        cleanupOutdatedCaches: true,
        skipWaiting: false,
        clientsClaim: false,
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
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
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom"],
          "axios-idb": ["axios", "idb"],
        },
      },
    },
  },
  server: {
    port: 3100,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
  test: {
    include: ["test/**/*.test.ts", "test/**/*.test.tsx"],
    globals: true,
    environment: "happy-dom",
    setupFiles: "./test/setupTests.ts",
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      reportsDirectory: "./coverage",
      exclude: [
        "node_modules/",
        "test/",
        "dist/",
        "**/*.config.*",
        "**/*.d.ts",
        "**/types/",
        "src/vite-env.d.ts",
      ],
      all: true,
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
    },
  },
});
