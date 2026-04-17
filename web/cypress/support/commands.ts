// cypress/support/commands.ts

declare namespace Cypress {
  interface Chainable {
    login(): Chainable<void>;
    playSong(songTitle: string): Chainable<void>;
    openPlaylist(playlistName: string): Chainable<void>;
  }
}

Cypress.Commands.add('login', () => {
  cy.session('user', () => {
    cy.visit('/login');
    cy.get('input[name="email"]').type('test@example.com');
    cy.get('input[name="password"]').type('password123');
    cy.get('[data-testid="login-btn"]').click();
    cy.url().should('include', '/home');
  });
});

Cypress.Commands.add('playSong', (songTitle: string) => {
  cy.get('[data-testid="search-input"]').type(songTitle);
  cy.contains(songTitle).click();
  cy.contains('Play').click();
});

Cypress.Commands.add('openPlaylist', (playlistName: string) => {
  cy.contains(playlistName).click();
  cy.get('[data-testid="playlist-view"]').should('be.visible');
});
