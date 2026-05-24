describe("primary layout", () => {
  it("renders the main navigation and sidebar", () => {
    cy.visitHomePage();

    cy.getByTestId("search-input")
      .filter(":visible")
      .first()
      .should("be.visible");
    cy.get('button[aria-label="Side menu toggle"]').click();
    cy.getByTestId("app-sidebar")
      .should("have.attr", "data-state", "open")
      .and("contain.text", "Map Analytics")
      .and("contain.text", "Leaderboard");
  });
});
