import * as fc from 'fast-check';
import { Test } from '@nestjs/testing';
import { ActivityListener } from './activity.listener';
import { PrismaService } from '../prisma/prisma.service';

describe('ActivityListener', () => {
  let listener: ActivityListener;
  let prisma: Record<string, any>;

  beforeEach(async () => {
    prisma = {
      activityLog: { create: jest.fn().mockResolvedValue({}) },
    };

    const module = await Test.createTestingModule({
      providers: [
        ActivityListener,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    listener = module.get(ActivityListener);
  });

  // Feature: music-streaming-app, Property 29: Activity log entries contain all required fields
  describe('Property 29: log entries have userId, action, timestamp; songId for song actions', () => {
    it('play event writes log with userId and songId', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.uuid(),
          async (userId, songId) => {
            prisma.activityLog.create.mockClear();
            await listener.onPlay({ userId, songId });

            expect(prisma.activityLog.create).toHaveBeenCalledWith(
              expect.objectContaining({
                data: expect.objectContaining({ userId, songId, action: 'play' }),
              }),
            );
          },
        ),
        { numRuns: 30 },
      );
    });

    it('handler errors are swallowed and do not throw', async () => {
      await fc.assert(
        fc.asyncProperty(fc.uuid(), async (userId) => {
          prisma.activityLog.create.mockRejectedValue(new Error('DB down'));
          // Should not throw
          await expect(listener.onPlay({ userId, songId: 'song-1' })).resolves.toBeUndefined();
        }),
        { numRuns: 20 },
      );
    });
  });
});
