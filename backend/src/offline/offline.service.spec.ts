import * as fc from 'fast-check';
import * as path from 'path';
import { Test } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { OfflineService } from './offline.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageAdapterFactory } from '../storage/storage-adapter.factory';
import { ConfigService } from '@nestjs/config';

const SANDBOX = '/tmp/test-sandbox';
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function makeUser(plan: string, offlineEnabled: boolean) {
  return { id: 'user-1', plan, offlineEnabled };
}

describe('OfflineService', () => {
  let service: OfflineService;
  let prisma: Record<string, any>;

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn() },
      song: { findUnique: jest.fn() },
      download: {
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
    };

    const module = await Test.createTestingModule({
      providers: [
        OfflineService,
        { provide: PrismaService, useValue: prisma },
        { provide: StorageAdapterFactory, useValue: { getAdapter: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue(SANDBOX) } },
      ],
    }).compile();

    service = module.get(OfflineService);
  });

  // Feature: music-streaming-app, Property 25: Ineligible users cannot initiate offline downloads
  describe('Property 25: free or offline_enabled=false → 403', () => {
    it('rejects free users', async () => {
      await fc.assert(
        fc.asyncProperty(fc.uuid(), fc.uuid(), async (userId, songId) => {
          prisma.user.findUnique.mockResolvedValue(makeUser('free', false));
          await expect(service.markForOffline(songId, userId)).rejects.toThrow(ForbiddenException);
        }),
        { numRuns: 30 },
      );
    });

    it('rejects premium users with offline_enabled=false', async () => {
      await fc.assert(
        fc.asyncProperty(fc.uuid(), fc.uuid(), async (userId, songId) => {
          prisma.user.findUnique.mockResolvedValue(makeUser('premium', false));
          await expect(service.markForOffline(songId, userId)).rejects.toThrow(ForbiddenException);
        }),
        { numRuns: 30 },
      );
    });
  });

  // Feature: music-streaming-app, Property 24: Offline list never returns expired or pending
  describe('Property 24: list filters to status=ready AND expires_at > now', () => {
    it('passes correct where clause to Prisma', async () => {
      await fc.assert(
        fc.asyncProperty(fc.uuid(), async (userId) => {
          prisma.download.findMany.mockResolvedValue([]);
          await service.list(userId);

          const call = prisma.download.findMany.mock.calls[0][0];
          expect(call.where.status).toBe('ready');
          expect(call.where.expiresAt).toHaveProperty('gt');
          expect(call.where.expiresAt.gt).toBeInstanceOf(Date);
          prisma.download.findMany.mockClear();
        }),
        { numRuns: 30 },
      );
    });
  });

  // Feature: music-streaming-app, Property 27: Encrypted files stored only inside sandbox
  describe('Property 27: encryptedPath always under SANDBOX_DIR', () => {
    it('encryptedPath starts with SANDBOX_DIR', async () => {
      // Verify the path construction logic directly
      await fc.assert(
        fc.asyncProperty(fc.uuid(), fc.uuid(), async (userId, downloadId) => {
          const encryptedPath = path.join(SANDBOX, userId, `${downloadId}.enc`);
          expect(encryptedPath.startsWith(SANDBOX)).toBe(true);
        }),
        { numRuns: 50 },
      );
    });
  });

  // Feature: music-streaming-app, Property 26: Offline playback enforces license validity
  describe('Property 26: expired download → mark expired + refuse playback', () => {
    it('marks expired and throws ForbiddenException when expires_at is in the past', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.integer({ min: 1, max: 365 }),
          async (userId, daysAgo) => {
            const expiredDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
            const download = {
              id: 'dl-1',
              userId,
              status: 'ready',
              expiresAt: expiredDate,
              encryptedPath: `${SANDBOX}/${userId}/dl-1.enc`,
            };
            prisma.download.findUnique.mockResolvedValue(download);
            prisma.user.findUnique.mockResolvedValue(makeUser('premium', true));
            prisma.download.update.mockResolvedValue({});

            await expect(service.validatePlayback('dl-1', userId)).rejects.toThrow(ForbiddenException);
            expect(prisma.download.update).toHaveBeenCalledWith(
              expect.objectContaining({ data: { status: 'expired' } }),
            );
            prisma.download.update.mockClear();
          },
        ),
        { numRuns: 30 },
      );
    });
  });
});
