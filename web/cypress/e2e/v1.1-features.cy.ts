describe('Lyrics Synchronization E2E', () => {
  beforeEach(() => {
    cy.visit('/player');
    cy.login();
  });

  it('should display lyrics when song is playing', () => {
    // Play a song with available lyrics
    cy.get('[data-testid="song-item"]').first().click();
    cy.contains('Play').click();

    // Lyrics should appear
    cy.get('[data-testid="lyrics-viewer"]').should('be.visible');
  });

  it('should sync lyrics with playback time', () => {
    cy.playSong('test-song-with-lyrics');

    // Check first lyric
    cy.get('[data-testid="lyric-line"]').first().should('have.class', 'active');

    // Wait and check next lyric
    cy.wait(2000);
    cy.get('[data-testid="lyric-line"]')
      .eq(1)
      .should('have.class', 'active');
  });

  it('should show message when lyrics unavailable', () => {
    cy.playSong('song-without-lyrics');
    cy.get('[data-testid="lyrics-viewer"]').should('contain', 'Lyrics not available');
  });
});

describe('Recommendations E2E', () => {
  beforeEach(() => {
    cy.visit('/home');
    cy.login();
  });

  it('should display recommendations panel on home', () => {
    cy.get('[data-testid="recommendations-panel"]').should('be.visible');
  });

  it('should load personal recommendations', () => {
    cy.get('[data-testid="recommendation-card"]').should('have.length.greaterThan', 0);
  });

  it('should play recommended song', () => {
    cy.get('[data-testid="recommendation-card"]').first().find('[data-testid="play-btn"]').click();

    cy.get('[data-testid="now-playing"]').should('be.visible');
  });

  it('should show similar songs for current track', () => {
    cy.playSong('current-song');
    cy.get('[data-testid="similar-songs"]').should('be.visible');
  });
});

describe('Collaborative Playlists E2E', () => {
  beforeEach(() => {
    cy.visit('/playlists');
    cy.login();
  });

  it('should create collaborative playlist', () => {
    cy.get('[data-testid="create-playlist"]').click();
    cy.get('input[name="title"]').type('Collab Playlist');
    cy.get('input[name="collaborative"]').check();
    cy.get('[data-testid="create-btn"]').click();

    cy.contains('Collab Playlist').should('be.visible');
  });

  it('should invite collaborator', () => {
    cy.openPlaylist('My Playlist');
    cy.get('[data-testid="invite-btn"]').click();
    cy.get('input[name="email"]').type('friend@example.com');
    cy.get('[data-testid="send-invite"]').click();

    cy.contains('Invite sent').should('be.visible');
  });

  it('should real-time sync when collaborator adds song', () => {
    // Open playlist in 2 tabs/windows simulation
    cy.openPlaylist('Collab Playlist');
    cy.get('[data-testid="song-count"]').then(($el) => {
      const initialCount = parseInt($el.text());

      // Simulate another user adding song
      cy.request('POST', '/api/v1/playlists/123/songs', {
        songId: 'new-song',
      });

      // Should update in real-time
      cy.wait(500);
      cy.get('[data-testid="song-count"]').should('contain', initialCount + 1);
    });
  });

  it('should show active collaborators', () => {
    cy.openPlaylist('Collab Playlist');
    cy.get('[data-testid="collaborators-badge"]').should('contain', '2 editing');
  });
});
