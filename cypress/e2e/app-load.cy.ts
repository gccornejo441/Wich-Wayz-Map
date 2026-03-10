describe("home page", () => {
  it("loads successfully", () => {
    cy.visitHomePage();

    cy.getByTestId("app-nav").should("be.visible");
    cy.getByTestId("map-root").should("exist");
    cy.getByTestId("map-canvas").should("exist");
  });
});
