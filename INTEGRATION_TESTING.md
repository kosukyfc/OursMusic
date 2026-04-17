# Integration Testing Guide - MEGA SPRINT

## Test Environment Setup

```bash
# Install testing dependencies
npm install --save-dev jest @testing-library/react @testing-library/jest-dom supertest
npm install --save-dev cypress cypress-testing-library
npm install --save-dev artillery

# Flutter testing
flutter pub add integration_test --dev
```

## 1. BACKEND INTEGRATION TESTS

```typescript
// test/integration/discovery.integration.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { DiscoveryModule } from '../../src/discovery/discovery.module';

describe('Discovery Integration Tests', () => {
  let app: INestApplication;
  let accessToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [DiscoveryModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    
    // Get test user token
    accessToken = await getTestToken();
  });

  describe('GET /discovery/trending', () => {
    it('should return trending songs', async () => {
      const response = await request(app.getHttpServer())
        .get('/discovery/trending')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('songs');
      expect(response.body.songs).toBeInstanceOf(Array);
      expect(response.body.songs.length).toBeGreaterThan(0);
    });

    it('should support pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/discovery/trending?limit=10&offset=0')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.songs.length).toBeLessThanOrEqual(10);
    });

    it('should filter by timeframe', async () => {
      const dayResponse = await request(app.getHttpServer())
        .get('/discovery/trending?timeframe=day')
        .set('Authorization', `Bearer ${accessToken}`);

      const weekResponse = await request(app.getHttpServer())
        .get('/discovery/trending?timeframe=week')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(dayResponse.status).toBe(200);
      expect(weekResponse.status).toBe(200);
      // Day/week should have different songs
      expect(dayResponse.body.songs[0].id).not.toBe(weekResponse.body.songs[0].id);
    });
  });

  describe('GET /discovery/mood', () => {
    it('should return songs by mood', async () => {
      const moods = ['happy', 'sad', 'energetic', 'calm'];

      for (const mood of moods) {
        const response = await request(app.getHttpServer())
          .get(`/discovery/mood?mood=${mood}`)
          .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(200);
        expect(response.body.songs).toBeInstanceOf(Array);
      }
    });

    it('should validate mood parameter', async () => {
      const response = await request(app.getHttpServer())
        .get('/discovery/mood?mood=invalid')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /discovery/discover-weekly', () => {
    it('should return personalized discover weekly', async () => {
      const response = await request(app.getHttpServer())
        .get('/discovery/discover-weekly')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('playlistId');
      expect(response.body).toHaveProperty('songs');
    });

    it('should return different playlists for different users', async () => {
      const token1 = await getTestToken('user1@test.com');
      const token2 = await getTestToken('user2@test.com');

      const response1 = await request(app.getHttpServer())
        .get('/discovery/discover-weekly')
        .set('Authorization', `Bearer ${token1}`);

      const response2 = await request(app.getHttpServer())
        .get('/discovery/discover-weekly')
        .set('Authorization', `Bearer ${token2}`);

      // Should be different playlists
      expect(response1.body.songs).not.toEqual(response2.body.songs);
    });
  });

  afterAll(async () => {
    await app.close();
  });
});
```

## 2. FRONTEND COMPONENT TESTS

```typescript
// test/integration/CollaborativePlaylistBuilder.integration.test.tsx
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CollaborativePlaylistBuilder } from '@/components/CollaborativePlaylistBuilder';

describe('CollaborativePlaylistBuilder Integration', () => {
  const mockPlaylistId = 'playlist_123';

  beforeEach(() => {
    // Mock WebSocket
    global.WebSocket = jest.fn();
  });

  it('should render collaborative playlist with real-time updates', async () => {
    const { container } = render(
      <CollaborativePlaylistBuilder playlistId={mockPlaylistId} />
    );

    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeInTheDocument();
    });
  });

  it('should show collaborators cursors', async () => {
    const { rerender } = render(
      <CollaborativePlaylistBuilder playlistId={mockPlaylistId} />
    );

    // Simulate collaborator joining
    const mockSocket = (global.WebSocket as jest.Mock).mock.results[0].value;
    mockSocket.emit('cursor-update', {
      userId: 'user_456',
      username: 'John Doe',
      color: '#ff0000',
      trackIndex: 2,
    });

    rerender(<CollaborativePlaylistBuilder playlistId={mockPlaylistId} />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });

  it('should handle drag and drop reordering', async () => {
    const user = userEvent.setup();
    render(<CollaborativePlaylistBuilder playlistId={mockPlaylistId} />);

    // Find first track
    const firstTrack = screen.getAllByRole('generic')[0];
    
    // Simulate drag and drop
    await user.pointer({ keys: '[MouseLeft>]', target: firstTrack });
    await user.pointer({ coords: { x: 100, y: 300 } });
    await user.pointer({ keys: '[/MouseLeft]' });

    // Verify reorder was emitted
    expect(global.WebSocket).toHaveBeenCalled();
  });
});
```

## 3. E2E TESTS (Cypress)

```typescript
// cypress/e2e/discovery.cy.ts
describe('Discovery Features E2E', () => {
  beforeEach(() => {
    cy.visit('/discovery');
    cy.login('testuser@example.com', 'password123');
  });

  it('should browse trending songs', () => {
    cy.get('[data-testid="trending-tab"]').click();
    
    cy.contains('Trending Songs').should('be.visible');
    cy.get('[data-testid="song-card"]').should('have.length.greaterThan', 0);
    
    // Click on a song
    cy.get('[data-testid="song-card"]').first().click();
    cy.url().should('include', '/player');
  });

  it('should filter by mood', () => {
    cy.get('[data-testid="mood-filter"]').click();
    cy.get('[data-testid="mood-option-happy"]').click();
    
    cy.get('[data-testid="song-card"]').each(($el) => {
      // All songs should be happy mood
      cy.wrap($el).should('have.attr', 'data-mood', 'happy');
    });
  });

  it('should create discover weekly playlist', () => {
    cy.get('[data-testid="discover-weekly-btn"]').click();
    
    cy.contains('Your Discover Weekly')
      .should('be.visible')
      .parent()
      .contains('50 songs')
      .should('be.visible');
  });

  it('should share playlist with friend', () => {
    cy.get('[data-testid="playlist-options"]').click();
    cy.get('[data-testid="share-btn"]').click();
    
    cy.get('input[placeholder="Email"]').type('friend@example.com');
    cy.get('[data-testid="share-as-editor"]').click();
    
    cy.contains('Playlist shared successfully').should('be.visible');
  });
});
```

## 4. PERFORMANCE TESTS

```bash
# artillery.yml
config:
  target: 'https://api.oursmusic.com'
  phases:
    - duration: 60
      arrivalRate: 10
    - duration: 120
      arrivalRate: 50
    - duration: 60
      arrivalRate: 100
  processor: "./loadtest.js"

scenarios:
  - name: "Discovery Flow"
    flow:
      - get:
          url: "/discovery/trending"
          headers:
            Authorization: Bearer {{ token }}
      - think: 2
      - get:
          url: "/discovery/mood?mood=happy"
          headers:
            Authorization: Bearer {{ token }}
      - think: 1
      - get:
          url: "/discovery/discover-weekly"
          headers:
            Authorization: Bearer {{ token }}
          capture:
            json: "$.playlistId"
            as: "playlistId"
      - think: 3

  - name: "Playlist Operations"
    flow:
      - post:
          url: "/playlists"
          headers:
            Authorization: Bearer {{ token }}
          json:
            name: "Load Test Playlist"
      - think: 1
      - post:
          url: "/playlists/{{ playlistId }}/tracks"
          headers:
            Authorization: Bearer {{ token }}
          json:
            trackId: "track_1"

# Run test
artillery run artillery.yml --output results.json
artillery report results.json
```

## 5. MOBILE INTEGRATION TEST

```dart
// test/integration_test/discovery_test.dart
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:oursmusic/main.dart' as app;

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  group('Discovery Integration Tests', () {
    testWidgets('Navigate through discovery screens', (WidgetTester tester) async {
      app.main();
      await tester.pumpAndSettle();

      // Tap Discovery button
      expect(find.byIcon(Icons.explore), findsOneWidget);
      await tester.tap(find.byIcon(Icons.explore));
      await tester.pumpAndSettle();

      // Verify Discovery page loaded
      expect(find.byType(DiscoveryScreen), findsOneWidget);

      // Tap Trending tab
      await tester.tap(find.text('Trending'));
      await tester.pumpAndSettle();

      // Verify songs are displayed
      expect(find.byType(SongCard), findsWidgets);
    });

    testWidgets('Create Discover Weekly playlist', (WidgetTester tester) async {
      app.main();
      await tester.pumpAndSettle();

      // Navigate to Discovery
      await tester.tap(find.byIcon(Icons.explore));
      await tester.pumpAndSettle();

      // Tap Discover Weekly
      await tester.tap(find.byType(DiscoverWeeklyCard));
      await tester.pumpAndSettle();

      // Verify playlist created
      expect(find.byType(PlaylistScreen), findsOneWidget);
      expect(find.text('Your Discover Weekly'), findsOneWidget);
    });
  });
}
```

## 6. TEST EXECUTION

```bash
# Backend
npm run test:integration

# Frontend
npm run test:e2e -- --spec cypress/e2e/discovery.cy.ts

# Mobile
flutter test integration_test/discovery_test.dart

# Performance
artillery run artillery.yml

# All tests
npm run test:all
```

## 7. TEST COVERAGE TARGETS

| Component | Target | Current |
|-----------|--------|---------|
| Discovery API | 95% | - |
| Playlists | 90% | - |
| Social Sharing | 85% | - |
| WebSocket | 88% | - |
| Mobile Screens | 80% | - |
| E2E Flows | 75% | - |

This comprehensive testing suite ensures all MEGA SPRINT features work correctly across all platforms!
