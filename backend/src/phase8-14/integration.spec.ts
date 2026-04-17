import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

// ============================================================================
// INTEGRATION TESTS - Phases 8-14
// ============================================================================

describe('Phase 8-14 Integration Tests', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [],
      providers: [],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // ========== PHASE 8: Advanced Integrations ==========

  describe('Phase 8: Spotify Connect Integration', () => {
    it('should get user devices', async () => {
      const response = await request(app.getHttpServer())
        .get('/integrations/spotify/devices')
        .query({ userId: 'test-user-1' });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should transfer playback to device', async () => {
      const response = await request(app.getHttpServer())
        .post('/integrations/spotify/playback/transfer')
        .send({ userId: 'test-user-1', deviceId: 'device-1', play: true });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should get current playback state', async () => {
      const response = await request(app.getHttpServer())
        .get('/integrations/spotify/playback/current')
        .query({ userId: 'test-user-1' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('isPlaying');
      expect(response.body).toHaveProperty('device');
    });

    it('should control playback (play)', async () => {
      const response = await request(app.getHttpServer())
        .post('/integrations/spotify/playback/play')
        .send({ userId: 'test-user-1' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should adjust volume', async () => {
      const response = await request(app.getHttpServer())
        .put('/integrations/spotify/playback/volume')
        .send({ userId: 'test-user-1', volumePercent: 75 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Phase 8: Voice Assistant Integration', () => {
    it('should process voice command', async () => {
      const response = await request(app.getHttpServer())
        .post('/integrations/voice/command/process')
        .send({ userId: 'test-user-1', command: 'play my workout playlist' });

      expect(response.status).toBel200);
    });

    it('should support multi-platform commands', async () => {
      const platforms = ['google_home', 'alexa', 'siri'];

      for (const platform of platforms) {
        const response = await request(app.getHttpServer())
          .post(`/integrations/voice/${platform}/command`)
          .send({ userId: 'test-user-1', command: 'next track' });

        expect(response.status).toBe(200);
      }
    });
  });

  // ========== PHASE 9: Advanced AI & Personalization ==========

  describe('Phase 9: Mood Detection', () => {
    it('should detect current user mood', async () => {
      const response = await request(app.getHttpServer())
        .get('/ai/mood/current')
        .query({ userId: 'test-user-1' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('primaryMood');
      expect(response.body).toHaveProperty('intensity');
      expect(response.body).toHaveProperty('confidence');
    });

    it('should generate mood-based playlist', async () => {
      const response = await request(app.getHttpServer())
        .get('/ai/mood/playlist/happy');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('tracks');
    });

    it('should predict mood changes', async () => {
      const response = await request(app.getHttpServer())
        .post('/ai/mood/predict')
        .send({ userId: 'test-user-1', hoursAhead: 4 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('predictedMood');
    });
  });

  describe('Phase 9: AI DJ Personality', () => {
    it('should get AI DJ personality', async () => {
      const response = await request(app.getHttpServer())
        .get('/ai/dj/personality')
        .query({ userId: 'test-user-1' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('style');
    });

    it('should predict next track', async () => {
      const response = await request(app.getHttpServer())
        .post('/ai/dj/predict-next')
        .send({ userId: 'test-user-1' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('track');
      expect(response.body).toHaveProperty('confidence');
    });

    it('should generate batch predictions', async () => {
      const response = await request(app.getHttpServer())
        .post('/ai/dj/predict-batch')
        .send({ userId: 'test-user-1', count: 10 });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(10);
    });
  });

  // ========== PHASE 10: Social & Community ==========

  describe('Phase 10: User Profiles', () => {
    it('should get user profile', async () => {
      const response = await request(app.getHttpServer())
        .get('/profiles/test-user-1');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('username');
      expect(response.body).toHaveProperty('followers');
    });

    it('should update profile', async () => {
      const response = await request(app.getHttpServer())
        .put('/profiles/test-user-1')
        .send({ displayName: 'Test User', bio: 'Music lover' });

      expect(response.status).toBe(200);
      expect(response.body.displayName).toBe('Test User');
    });

    it('should follow user', async () => {
      const response = await request(app.getHttpServer())
        .post('/profiles/test-user-1/follow')
        .query({ targetUserId: 'test-user-2' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should verify following relationship', async () => {
      await request(app.getHttpServer())
        .post('/profiles/test-user-1/follow')
        .query({ targetUserId: 'test-user-2' });

      const response = await request(app.getHttpServer())
        .get('/profiles/test-user-1/following');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('Phase 10: Listening Parties', () => {
    it('should create listening party', async () => {
      const response = await request(app.getHttpServer())
        .post('/listening-parties/create')
        .send({
          hostId: 'test-user-1',
          name: 'Epic Road Trip',
          isPublic: true,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id');
      expect(response.body.hostId).toBe('test-user-1');
    });

    it('should join listening party', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/listening-parties/create')
        .send({ hostId: 'test-user-1', name: 'Party' });

      const partyId = createRes.body.id;

      const response = await request(app.getHttpServer())
        .post(`/listening-parties/${partyId}/join`)
        .send({ userId: 'test-user-2' });

      expect(response.status).toBe(200);
    });
  });

  describe('Phase 10: Challenges', () => {
    it('should get active challenges', async () => {
      const response = await request(app.getHttpServer())
        .get('/challenges/active');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should submit to challenge', async () => {
      const response = await request(app.getHttpServer())
        .post('/challenges/submit')
        .send({
          userId: 'test-user-1',
          challengeId: 'challenge-1',
          playlistId: 'playlist-1',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('submissionId');
    });
  });

  // ========== PHASE 11: Artist Tools ==========

  describe('Phase 11: Artist Dashboard', () => {
    it('should get artist metrics', async () => {
      const response = await request(app.getHttpServer())
        .get('/artist/dashboard/metrics')
        .query({ artistId: 'artist-1' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('totalStreams');
      expect(response.body).toHaveProperty('totalRevenue');
    });

    it('should get daily metrics', async () => {
      const response = await request(app.getHttpServer())
        .get('/artist/dashboard/metrics/daily')
        .query({ artistId: 'artist-1', date: '2026-01-15' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('streams');
    });

    it('should get revenue by source', async () => {
      const response = await request(app.getHttpServer())
        .get('/artist/dashboard/revenue/sources')
        .query({ artistId: 'artist-1' });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body[0]).toHaveProperty('platform');
    });
  });

  describe('Phase 11: Royalty Tracking', () => {
    it('should calculate royalties', async () => {
      const response = await request(app.getHttpServer())
        .get('/royalties/calculate/monthly')
        .query({ artistId: 'artist-1', month: 'jan' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('totalStreams');
      expect(response.body).toHaveProperty('revenue');
    });

    it('should get payment schedule', async () => {
      const response = await request(app.getHttpServer())
        .get('/royalties/payment-schedule')
        .query({ artistId: 'artist-1' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('nextPaymentDate');
    });
  });

  // ========== PHASE 12: Advanced Monetization ==========

  describe('Phase 12: Dynamic Pricing', () => {
    it('should calculate dynamic price', async () => {
      const response = await request(app.getHttpServer())
        .post('/pricing/calculate-dynamic')
        .send({ userId: 'test-user-1', productId: 'premium_month' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('price');
    });

    it('should reflect demand in pricing', async () => {
      const response = await request(app.getHttpServer())
        .get('/pricing/demand-level/premium_month');

      expect(response.status).toBe(200);
      expect(['low', 'medium', 'high', 'extreme']).toContain(response.body.demandLevel);
    });
  });

  describe('Phase 12: In-App Purchases', () => {
    it('should get IAP products', async () => {
      const response = await request(app.getHttpServer())
        .get('/purchases/products');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should process purchase', async () => {
      const response = await request(app.getHttpServer())
        .post('/purchases/purchase')
        .send({
          userId: 'test-user-1',
          productId: 'coins_100',
          paymentMethod: 'card',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('transactionId');
    });
  });

  // ========== PHASE 13: Analytics ==========

 describe('Phase 13: Churn Prediction', () => {
    it('should predict churn risk', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/churn/predict/test-user-1');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('churnRiskScore');
      expect(typeof response.body.churnRiskScore).toBe('number');
    });

    it('should provide intervention recommendations', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/churn/interventions/test-user-1');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('Phase 13: Segmentation', () => {
    it('should create user segment', async () => {
      const response = await request(app.getHttpServer())
        .post('/segmentation/create')
        .send({
          name: 'High Value Users',
          rules: [{ field: 'ltv', operator: '>', value: 100 }],
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id');
    });

    it('should get segment members', async () => {
      const response = await request(app.getHttpServer())
        .get('/segmentation/segment-1/members');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('Phase 13: A/B Testing', () => {
    it('should create experiment', async () => {
      const response = await request(app.getHttpServer())
        .post('/analytics/experiments/create')
        .send({
          name: 'Pricing Test',
          hypothesis: 'Lower price increases conversion',
          variants: ['$4.99', '$7.99', '$9.99'],
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('experimentId');
    });

    it('should assign variant to user', async () => {
      const response = await request(app.getHttpServer())
        .post('/analytics/experiments/exp-1/assign')
        .send({ userId: 'test-user-1' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('assignedVariant');
    });

    it('should record conversion', async () => {
      const response = await request(app.getHttpServer())
        .post('/analytics/experiments/exp-1/event')
        .send({ userId: 'test-user-1', event: 'purchase', value: 9.99 });

      expect(response.status).toBe(200);
    });

    it('should analyze results', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/experiments/exp-1/results');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('winner');
    });
  });

  // ========== PHASE 14: Compliance & Expansion ==========

  describe('Phase 14: Internationalization', () => {
    it('should set user locale', async () => {
      const response = await request(app.getHttpServer())
        .post('/i18n/locale/set')
        .send({ userId: 'test-user-1', locale: 'pt-BR' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should convert currency', async () => {
      const response = await request(app.getHttpServer())
        .post('/i18n/currency/convert')
        .send({ amount: 100, from: 'USD', to: 'BRL' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('result');
      expect(response.body.result > 400).toBe(true); // 100 USD ≈ 520 BRL
    });

    it('should get regional content', async () => {
      const response = await request(app.getHttpServer())
        .get('/i18n/regional-content/BR');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('featuredArtists');
    });
  });

  describe('Phase 14: Privacy & GDPR', () => {
    it('should create privacy request', async () => {
      const response = await request(app.getHttpServer())
        .post('/privacy/request/access')
        .send({ userId: 'test-user-1' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('requestId');
    });

    it('should record consent', async () => {
      const response = await request(app.getHttpServer())
        .post('/privacy/consent/record')
        .send({
          userId: 'test-user-1',
          type: 'marketing',
          given: true,
        });

      expect(response.status).toBe(200);
    });

    it('should export user data', async () => {
      const response = await request(app.getHttpServer())
        .post('/privacy/data/export')
        .send({ userId: 'test-user-1' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
    });
  });

  // ========== CROSS-PHASE INTEGRATION TESTS ==========

  describe('End-to-End User Journey', () => {
    it('should complete full user flow: signup -> profile -> follow -> create party', async () => {
      // 1. Create profile
      const profileRes = await request(app.getHttpServer())
        .put('/profiles/journey-user')
        .send({ displayName: 'Journey User', bio: 'Testing' });

      expect(profileRes.status).toBe(200);

      // 2. Follow another user
      const followRes = await request(app.getHttpServer())
        .post('/profiles/journey-user/follow')
        .query({ targetUserId: 'popular-user' });

      expect(followRes.status).toBe(200);

      // 3. Create listening party
      const partyRes = await request(app.getHttpServer())
        .post('/listening-parties/create')
        .send({
          hostId: 'journey-user',
          name: 'Journey Party',
          isPublic: true,
        });

      expect(partyRes.status).toBe(200);

      // 4. Get recommendations
      const recRes = await request(app.getHttpServer())
        .get('/ai/mood/current')
        .query({ userId: 'journey-user' });

      expect(recRes.status).toBe(200);
    });

    it('should complete artist flow: register -> upload -> track analytics -> receive payment', async () => {
      // 1. Register as independent artist
      const registerRes = await request(app.getHttpServer())
        .post('/independent/register')
        .send({ artistName: 'Test Artist', bio: 'Independent' });

      expect(registerRes.status).toBe(200);

      // 2. Get dashboard metrics
      const metricsRes = await request(app.getHttpServer())
        .get('/artist/dashboard/metrics')
        .query({ artistId: registerRes.body.artistId });

      expect(metricsRes.status).toBe(200);

      // 3. Get royalty info
      const royaltyRes = await request(app.getHttpServer())
        .get('/royalties/payment-schedule')
        .query({ artistId: registerRes.body.artistId });

      expect(royaltyRes.status).toBe(200);
    });

    it('should handle multi-region deployment', async () => {
      const regions = ['BR', 'US', 'FR', 'JP'];

      for (const region of regions) {
        const response = await request(app.getHttpServer())
          .get('/i18n/regional-content/' + region);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('featuredArtists');
      }
    });
  });
});
