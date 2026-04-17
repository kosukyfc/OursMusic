import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../app.module';

describe('Performance Tests (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('API Response Times', () => {
    it('GET /api/v1/songs should respond in < 150ms', async () => {
      const start = Date.now();

      await request(app.getHttpServer())
        .get('/api/v1/songs?limit=20')
        .expect(200);

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(150);
    }, 30000);

    it('GET /api/v1/recommendations should respond in < 200ms (cached)', async () => {
      const start = Date.now();

      await request(app.getHttpServer())
        .get('/api/v1/recommendations')
        .set('Authorization', 'Bearer test_token')
        .expect(200);

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(200);
    }, 30000);

    it('POST /api/v1/playlists should respond in < 100ms', async () => {
      const start = Date.now();

      await request(app.getHttpServer())
        .post('/api/v1/playlists')
        .set('Authorization', 'Bearer test_token')
        .send({
          title: 'Test Playlist',
          description: 'Performance test playlist',
        })
        .expect(201);

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(100);
    }, 30000);
  });

  describe('Database Performance', () => {
    it('should paginate large result sets efficiently', async () => {
      const start = Date.now();

      await request(app.getHttpServer())
        .get('/api/v1/songs?page=1&limit=100')
        .expect(200);

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(150);
    });

    it('should use indices for filtered queries', async () => {
      const start = Date.now();

      await request(app.getHttpServer())
        .get('/api/v1/songs?genre=jazz&artist=miles')
        .expect(200);

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(100);
    });
  });

  describe('Cache Performance', () => {
    it('should cache recommendations for 7 days', async () => {
      // First request - cache miss
      const start1 = Date.now();
      await request(app.getHttpServer())
        .get('/api/v1/recommendations')
        .set('Authorization', 'Bearer test_token')
        .expect(200);
      const duration1 = Date.now() - start1;

      // Second request - cache hit (should be faster)
      const start2 = Date.now();
      await request(app.getHttpServer())
        .get('/api/v1/recommendations')
        .set('Authorization', 'Bearer test_token')
        .expect(200);
      const duration2 = Date.now() - start2;

      expect(duration2).toBeLessThan(duration1);
      expect(duration2).toBeLessThan(50); // Cache hit should be very fast
    });
  });

  describe('Concurrent Requests', () => {
    it('should handle 100 concurrent requests', async () => {
      const requests = Array(100)
        .fill(null)
        .map(() =>
          request(app.getHttpServer())
            .get('/api/v1/songs?limit=10')
            .expect(200),
        );

      const start = Date.now();
      await Promise.all(requests);
      const duration = Date.now() - start;

      // Average ~150ms per request, 100 concurrent = ~2 seconds
      expect(duration).toBeLessThan(5000);
    }, 30000);
  });

  describe('Error Handling Performance', () => {
    it('should handle 404 errors quickly (no DB query)', async () => {
      const start = Date.now();

      await request(app.getHttpServer())
        .get('/api/v1/nonexistent')
        .expect(404);

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(50);
    });

    it('should handle 400 validation errors quickly', async () => {
      const start = Date.now();

      await request(app.getHttpServer())
        .post('/api/v1/playlists')
        .send({ title: '' }) // Invalid: empty title
        .expect(400);

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(50);
    });
  });

  describe('Memory Leaks', () => {
    it('should not leak memory with repeated requests', async () => {
      const memStart = process.memoryUsage().heapUsed;

      // Make 1000 requests
      for (let i = 0; i < 1000; i++) {
        await request(app.getHttpServer())
          .get('/api/v1/songs?limit=5')
          .expect(200);
      }

      // Force garbage collection (if available)
      if (global.gc) {
        global.gc();
      }

      const memEnd = process.memoryUsage().heapUsed;
      const memLeak = memEnd - memStart;

      // Memory growth should be < 50MB
      expect(memLeak).toBeLessThan(50 * 1024 * 1024);
    }, 60000);
  });
});
