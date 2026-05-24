import { defineConfig } from "cypress";

export default defineConfig({
  pageLoadTimeout: 120000,
  e2e: {
    baseUrl: "http://localhost:3100",
    specPattern: "cypress/e2e/**/*.cy.ts",
    supportFile: "cypress/support/e2e.ts",
  },
});
