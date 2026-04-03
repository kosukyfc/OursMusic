import * as fc from 'fast-check';
import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { SearchService } from './search.service';
import { PrismaService } from '../prisma/prisma.service';

describe('SearchService', () => {
  let service: SearchService;
  let prisma: Record<string, any>;

  beforeEach(async () => {
    prisma = {
      song: { findMany: jest.fn().mockResolvedValue([]) },
      album: { findMany: jest.fn().mockResolvedValue([]) },
      artist: { findMany: jest.fn().mockResolvedValue([]) },
    };

    const module = await Test.createTestingModule({
      providers: [
        SearchService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(SearchService);
  });

  it('empty query → 400', async () => {
    await expect(service.search('')).rejects.toThrow(BadRequestException);
    await expect(service.search('   ')).rejects.toThrow(BadRequestException);
  });

  // Feature: music-streaming-app, Property 28: Search returns only matching results (case-insensitive)
  describe('Property 28: search uses case-insensitive ILIKE', () => {
    it('passes mode: insensitive and the query term to Prisma', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          async (q) => {
            prisma.song.findMany.mockResolvedValue([]);
            prisma.album.findMany.mockResolvedValue([]);
            prisma.artist.findMany.mockResolvedValue([]);

            await service.search(q);

            expect(prisma.song.findMany).toHaveBeenCalledWith(
              expect.objectContaining({
                where: { title: { contains: q, mode: 'insensitive' } },
              }),
            );
            expect(prisma.album.findMany).toHaveBeenCalledWith(
              expect.objectContaining({
                where: { title: { contains: q, mode: 'insensitive' } },
              }),
            );
            expect(prisma.artist.findMany).toHaveBeenCalledWith(
              expect.objectContaining({
                where: { name: { contains: q, mode: 'insensitive' } },
              }),
            );

            prisma.song.findMany.mockClear();
            prisma.album.findMany.mockClear();
            prisma.artist.findMany.mockClear();
          },
        ),
        { numRuns: 50 },
      );
    });
  });
});
