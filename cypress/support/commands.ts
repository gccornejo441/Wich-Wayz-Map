/// <reference types="cypress" />

import {
  MODAL_VERSION,
  STORAGE_PREFIX,
} from "../../src/features/onboarding/constants";

type GetByTestIdOptions = Partial<
  Cypress.Loggable & Cypress.Timeoutable & Cypress.Withinable & Cypress.Shadow
>;

const buildOnboardingState = () =>
  JSON.stringify({
    version: MODAL_VERSION,
    seen: true,
    dismissedAt: Date.now(),
    locale: "en-US",
  });

Cypress.Commands.add(
  "getByTestId",
  (testId: string, options?: GetByTestIdOptions) => {
    return cy.get(`[data-testid="${testId}"]`, options);
  },
);

Cypress.Commands.add("visitHomePage", () => {
  cy.intercept("GET", "**/api/locations/count").as("getLocationCount");
  cy.intercept("GET", "**/api/shops").as("getShops");

  cy.visit("/", {
    onBeforeLoad(win: Window) {
      win.localStorage.setItem(
        `${STORAGE_PREFIX}:anon`,
        buildOnboardingState(),
      );
    },
  });

  cy.wait("@getLocationCount").its("response.statusCode").should("eq", 200);
  cy.wait("@getShops").its("response.statusCode").should("eq", 200);
  return cy.getByTestId("map-loading", { timeout: 20000 }).should("not.exist");
});

declare global {
  namespace Cypress {
    interface Chainable {
      getByTestId(
        testId: string,
        options?: GetByTestIdOptions,
      ): Chainable<JQuery<HTMLElement>>;
      visitHomePage(): Chainable<JQuery<HTMLElement>>;
    }
  }
}

export {};
