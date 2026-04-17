describe('OursMusic - Songs', () => {
  const API_URL = 'http://localhost:3000';

  beforeEach(() => {
    // Login before each test
    cy.visit(`${API_URL}/`);
    cy.login();
  });

  describe('Song Management', () => {
    it('should display songs list', () => {
      cy.get('[data-cy=songs-list]').should('exist');
      cy.get('[data-cy=song-item]').should('have.length.greaterThan', 0);
    });

    it('should play a song', () => {
      cy.get('[data-cy=song-item]').first().click();
      cy.get('[data-cy=player-playing]').should('be.visible');
      cy.get('[data-cy=current-song-title]').should('not.be.empty');
    });

    it('should add song to playlist', () => {
      cy.get('[data-cy=song-item]').first().rightClick();
      cy.get('[data-cy=add-to-playlist]').click();
      cy.get('[data-cy=playlist-modal]').should('be.visible');
      cy.get('[data-cy=playlist-item]').first().click();
      cy.get('[data-cy=success-message]').should('be.visible');
    });

    it('should favorite a song', () => {
      cy.get('[data-cy=song-item]').first().find('[data-cy=favorite-btn]').click();
      cy.get('[data-cy=favorite-btn]')
        .should('have.class', 'favorited');
      cy.get('[data-cy=success-message]').should('be.visible');
    });

    it('should search for songs', () => {
      cy.get('[data-cy=search-input]').type('test song');
      cy.get('[data-cy=song-item]')
        .should('have.length.greaterThan', 0);
      cy.get('[data-cy=song-item]')
        .first()
        .should('contain', 'test');
    });

    it('should filter by genre', () => {
      cy.get('[data-cy=genre-filter]').click();
      cy.get('[data-cy=genre-option]').first().click();
      cy.get('[data-cy=song-item]').each(($song) => {
        cy.wrap($song).should('contain', 'genre name');
      });
    });
  });

  describe('Playback Controls', () => {
    beforeEach(() => {
      cy.get('[data-cy=song-item]').first().click();
      cy.get('[data-cy=player]').should('be.visible');
    });

    it('should pause/play song', () => {
      cy.get('[data-cy=player-pause-btn]').click();
      cy.get('[data-cy=player-play-btn]').should('be.visible');

      cy.get('[data-cy=player-play-btn]').click();
      cy.get('[data-cy=player-pause-btn]').should('be.visible');
    });

    it('should skip to next song', () => {
      const initialSong = cy.get('[data-cy=current-song-title]').then(($el) => $el.text());

      cy.get('[data-cy=player-next-btn]').click();

      cy.get('[data-cy=current-song-title]').should(($newSong) => {
        expect($newSong.text()).not.to.equal(initialSong);
      });
    });

    it('should adjust volume', () => {
      cy.get('[data-cy=volume-slider]').invoke('val', 0.5).trigger('change');
      cy.get('[data-cy=volume-value]').should('contain', '50');
    });

    it('should seek to position', () => {
      cy.get('[data-cy=progress-bar]')
        .invoke('val', 30)
        .trigger('change');

      cy.get('[data-cy=current-time]').should('contain', '0:30');
    });
  });

  describe('Playlist Management', () => {
    it('should create playlist', () => {
      cy.get('[data-cy=create-playlist-btn]').click();
      cy.get('[data-cy=playlist-name-input]').type('My New Playlist');
      cy.get('[data-cy=create-btn]').click();
      cy.get('[data-cy=success-message]').should('be.visible');
    });

    it('should add songs to playlist', () => {
      cy.get('[data-cy=playlist-item]').first().click();
      cy.get('[data-cy=playlist-empty]').should('be.visible');

      cy.get('[data-cy=back-btn]').click();
      cy.get('[data-cy=song-item]').first().rightClick();
      cy.get('[data-cy=add-to-playlist]').click();
      // Select the playlist created above
    });

    it('should delete playlist', () => {
      cy.get('[data-cy=playlist-item]').first().rightClick();
      cy.get('[data-cy=delete-playlist]').click();
      cy.get('[data-cy=confirm-dialog]').should('be.visible');
      cy.get('[data-cy=confirm-btn]').click();
      cy.get('[data-cy=success-message]').should('be.visible');
    });
  });

  describe('Error Handling', () => {
    it('should handle network error', () => {
      cy.intercept('GET', `${API_URL}/songs`, {
        statusCode: 500,
        body: { message: 'Server error' },
      });

      cy.reload();
      cy.get('[data-cy=error-message]').should('be.visible');
    });

    it('should retry on timeout', () => {
      let requestCount = 0;
      cy.intercept(`${API_URL}/songs`, (req) => {
        requestCount++;
        if (requestCount === 1) {
          req.destroy();
        } else {
          req.continue();
        }
      });

      cy.reload();
      cy.get('[data-cy=retry-btn]').should('be.visible');
      cy.get('[data-cy=retry-btn]').click();
      cy.get('[data-cy=song-item]').should('exist');
    });
  });
});

// Custom Commands
Cypress.Commands.add('login', () => {
  cy.visit(`${API_URL}/`);
  cy.get('[data-cy=login-btn]').click();
  cy.get('[data-cy=email-input]').type('test@example.com');
  cy.get('[data-cy=password-input]').type('password123');
  cy.get('[data-cy=submit-btn]').click();
  cy.url().should('contain', '/dashboard');
});
