const ONBOARDING_STORAGE_KEY = "wichwayz_onboarding_v1:anon";

const buildOnboardingState = () =>
  JSON.stringify({
    version: "2026-02",
    seen: true,
    dismissedAt: Date.now(),
    locale: "en-US",
  });

const testCategories = [
  {
    id: 9001,
    category_name: "Deli",
  },
];

type CypressWindow = Window & {
  grecaptcha?: {
    ready: (callback: () => void) => void;
    execute: (siteKey: string, options: { action: string }) => Promise<string>;
  };
};

describe("shop submission", () => {
  it("redirects guests to sign in when they submit a valid shop form", () => {
    cy.intercept("GET", "https://api.mapbox.com/search/geocode/v6/forward**", {
      statusCode: 200,
      body: {
        features: [
          {
            geometry: {
              coordinates: [-73.9965, 40.7505],
            },
            properties: {
              context: {
                address: {
                  address_number: "123",
                  street_name: "Main St",
                },
                place: {
                  name: "New York",
                },
                region: {
                  name: "New York",
                  region_code: "US-NY",
                },
                postcode: {
                  name: "10001",
                },
                country: {
                  name: "United States",
                  country_code: "US",
                },
              },
            },
          },
        ],
      },
    }).as("addressLookup");

    cy.visit("/shops/add", {
      onBeforeLoad(win) {
        const stubWindow = win as CypressWindow;

        win.localStorage.setItem(
          ONBOARDING_STORAGE_KEY,
          buildOnboardingState(),
        );
        win.localStorage.setItem("categories", JSON.stringify(testCategories));
        win.sessionStorage.removeItem("safeUserMetadata");

        stubWindow.grecaptcha = {
          ready: (callback) => callback(),
          execute: () => Promise.resolve("cypress-recaptcha-token"),
        };

        Object.defineProperty(win.navigator, "geolocation", {
          configurable: true,
          value: {
            getCurrentPosition: (
              _success: PositionCallback,
              error?: PositionErrorCallback,
            ) => {
              error?.({
                code: 1,
                message: "Cypress geolocation disabled",
                PERMISSION_DENIED: 1,
                POSITION_UNAVAILABLE: 2,
                TIMEOUT: 3,
              } as GeolocationPositionError);
            },
            watchPosition: () => 0,
            clearWatch: () => undefined,
          },
        });
      },
    });

    cy.getByTestId("shop-form").should("be.visible");
    cy.contains("h4", "Add New Shop").should("be.visible");

    cy.get("#shopName").type("Cypress Corner Deli");
    cy.get("#shop_description").type(
      "A neighborhood sandwich shop with house-made bread and daily specials.",
    );
    cy.get('input[name="eligibility_confirmed"]').check({ force: true });

    cy.getByTestId("shop-category-select").click();
    cy.get("#shop-categories").type("Deli{enter}", { force: true });
    cy.getByTestId("shop-category-select").should("contain.text", "Deli");

    cy.get("#address").type("123 Main St");
    cy.get("#city").type("New York");
    cy.get("#state").select("NY");
    cy.get("#postcode").type("10001");

    cy.contains("button", "Search Address").click();
    cy.wait("@addressLookup");
    cy.contains("button", "Use This Address", { timeout: 10000 }).click();
    cy.contains("Confirmed").should("be.visible");

    cy.contains("button", /^Save$/)
      .should("not.be.disabled")
      .click();

    cy.location("pathname").should("eq", "/account/sign-in");
    cy.contains("h2", "Sign in").should("be.visible");
  });
});
