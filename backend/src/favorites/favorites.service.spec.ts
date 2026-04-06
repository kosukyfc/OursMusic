import * as fc from 'fast-check';
import { Test } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { FavoritesService } from './favorites.service';
import { PrismaService } from '../prisma/prisma.service';

describe('FavoritesService', () => {
  let service: FavoritesService;
  let prisma: Record<string, any>;

  beforeEach(async () => {
    prisma = {
      favorite: {
        findUnique: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
        findMany: jest.fn(),
      },
    };

    const module = await Test.createTestingModule({
      providers: [
        FavoritesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(FavoritesService);
  });

  // Feature: music-streaming-app, Property 21: Favorites round-trip
  describe('Property 21: add → remove round-trip; duplicate add → 409', () => {
    it('duplicate add returns 409', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.uuid(),
          async (userId, songId) => {
            const existing = { userId, songId, createdAt: new Date() };
            prisma.favorite.findUnique.mockResolvedValue(existing);

            await expect(service.add(userId, songId)).rejects.toThrow(ConflictException);
          },
        ),
        { numRuns: 50 },
      );
    });

    it('add then remove leaves no favorite record', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.uuid(),
          async (userId, songId) => {
            // add: not existing
            prisma.favorite.findUnique.mockResolvedValueOnce(null);
            prisma.favorite.create.mockResolvedValue({ userId, songId });

            await service.add(userId, songId);
            expect(prisma.favorite.create).toHaveBeenCalledWith({
              data: { userId, songId },
            });

            // remove: existing
            prisma.favorite.findUnique.mockResolvedValueOnce({ userId, songId });
            prisma.favorite.delete.mockResolvedValue({ userId, songId });

            await service.remove(userId, songId);
            expect(prisma.favorite.delete).toHaveBeenCalledWith({
              where: { userId_songId: { userId, songId } },
            });

            prisma.favorite.create.mockClear();
            prisma.favorite.delete.mockClear();
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  // Feature: music-streaming-app, Property 22: Favorites list is ordered by recency
  describe('Property 22: list is ordered by createdAt DESC', () => {
    it('passes orderBy: { createdAt: desc } to Prisma', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          async (userId) => {
            prisma.favorite.findMany.mockResolvedValue([]);
            await service.list(userId);

            expect(prisma.favorite.findMany).toHaveBeenCalledWith(
              expect.objectContaining({
                orderBy: { createdAt: 'desc' },
              }),
            );
            prisma.favorite.findMany.mockClear();
          },
        ),
        { numRuns: 30 },
      );
    });
  });
});
