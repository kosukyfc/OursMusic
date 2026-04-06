import * as fc from 'fast-check';
import { Test } from '@nestjs/testing';
import { SubscriptionService } from './subscription.service';
import { PrismaService } from '../prisma/prisma.service';

describe('SubscriptionService', () => {
  let service: SubscriptionService;
  let prisma: Record<string, any>;

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
      download: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      song: { count: jest.fn().mockResolvedValue(0) },
      $transaction: jest.fn(async (fn: any) => fn(prisma)),
    };

    const module = await Test.createTestingModule({
      providers: [
        SubscriptionService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(SubscriptionService);
  });

  // Feature: music-streaming-app, Property 33: Plan change is atomic
  describe('Property 33: plan change updates plan + offline_enabled atomically', () => {
    it('premium plan sets offlineEnabled=true', async () => {
      await fc.assert(
        fc.asyncProperty(fc.uuid(), async (userId) => {
          prisma.user.findUnique.mockResolvedValue({ id: userId, plan: 'free' });
          prisma.user.update.mockResolvedValue({ plan: 'premium', offlineEnabled: true });

          const result = await service.changePlan(userId, { plan: 'premium' });

          expect(result.offlineEnabled).toBe(true);
          expect(prisma.$transaction).toHaveBeenCalledTimes(1);
          prisma.$transaction.mockClear();
        }),
        { numRuns: 30 },
      );
    });

    it('free plan sets offlineEnabled=false', async () => {
      await fc.assert(
        fc.asyncProperty(fc.uuid(), async (userId) => {
          prisma.user.findUnique.mockResolvedValue({ id: userId, plan: 'premium' });
          prisma.user.update.mockResolvedValue({ plan: 'free', offlineEnabled: false });

          const result = await service.changePlan(userId, { plan: 'free' });

          expect(result.offlineEnabled).toBe(false);
          prisma.$transaction.mockClear();
        }),
        { numRuns: 30 },
      );
    });
  });

  // Feature: music-streaming-app, Property 34: Lapsed premium expires all downloads
  describe('Property 34: cron job expires ready downloads for free users', () => {
    it('calls updateMany with status=expired for lapsed users', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.uuid(), { minLength: 1, maxLength: 10 }),
          async (userIds) => {
            prisma.user.findMany.mockResolvedValue(userIds.map((id) => ({ id })));
            prisma.download.updateMany.mockResolvedValue({ count: userIds.length });

            await service.expireDownloadsForLapsedUsers();

            expect(prisma.download.updateMany).toHaveBeenCalledWith(
              expect.objectContaining({
                where: expect.objectContaining({ status: 'ready' }),
                data: { status: 'expired' },
              }),
            );
            prisma.download.updateMany.mockClear();
            prisma.user.findMany.mockClear();
          },
        ),
        { numRuns: 20 },
      );
    });

    it('does nothing when no lapsed users exist', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      await service.expireDownloadsForLapsedUsers();
      expect(prisma.download.updateMany).not.toHaveBeenCalled();
    });
  });
});
