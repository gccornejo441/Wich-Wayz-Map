interface ShopSummary {
  name: string;
  locations?: unknown[];
}

describe("shop discovery", () => {
  it("opens a shop detail view from search suggestions", () => {
    cy.visitHomePage();

    cy.request<ShopSummary[]>("/api/shops").then(({ body }) => {
      const targetShop = body.find(
        (shop) => shop.name && (shop.locations?.length ?? 0) > 0,
      );

      if (!targetShop) {
        throw new Error("No searchable shop was returned from /api/shops");
      }

      cy.getByTestId("search-input")
        .filter(":visible")
        .first()
        .clear()
        .type(targetShop.name);
      cy.contains('[data-testid="search-suggestion"]', targetShop.name, {
        timeout: 10000,
      }).click();

      cy.getByTestId("shop-details-sidebar").should(
        "have.attr",
        "data-state",
        "open",
      );
      cy.getByTestId("shop-details-title").should(
        "contain.text",
        targetShop.name,
      );
      cy.contains("button", "Get Directions").should("be.visible");
    });
  });
});
