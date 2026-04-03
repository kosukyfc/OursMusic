import * as fc from 'fast-check';
import { Test } from '@nestjs/testing';
import { BadGatewayException } from '@nestjs/common';
import { ImportService } from './import.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageAdapterFactory } from '../storage/storage-adapter.factory';
import { StorageType } from '@prisma/client';

const AUDIO_MIMES = ['audio/mpeg', 'audio/flac', 'audio/aac', 'audio/ogg'];
const NON_AUDIO_MIMES = ['image/jpeg', 'application/pdf', 'video/mp4'];

function makeStorageFile(path: string, mimeType: string, size = 1000) {
  return { path, mimeType, size };
}

describe('ImportService', () => {
  let service: ImportService;
  let prisma: jest.Mocked<PrismaService>;
  let factory: jest.Mocked<StorageAdapterFactory>;
  let mockAdapter: { listFiles: jest.Mock };

  beforeEach(async () => {
    mockAdapter = { listFiles: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        ImportService,
        {
          provide: PrismaService,
          useValue: {
            song: {
              findMany: jest.fn(),
              createMany: jest.fn(),
            },
            user: {
              findUnique: jest.fn(),
            },
          },
        },
        {
          provide: StorageAdapterFactory,
          useValue: { getAdapter: jest.fn().mockReturnValue(mockAdapter) },
        },
      ],
    }).compile();

    service = module.get(ImportService);
    prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
    factory = module.get(StorageAdapterFactory) as jest.Mocked<StorageAdapterFactory>;
  });

  // Feature: music-streaming-app, Property 14: Import is idempotent across adapters
  describe('Property 14: idempotent import', () => {
    it('second import skipped count equals first import created count', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              path: fc.string({ minLength: 5, maxLength: 50 }).map(s => `songs/${s}.mp3`),
              mimeType: fc.constantFrom(...AUDIO_MIMES),
              size: fc.integer({ min: 1000, max: 10_000_000 }),
            }),
            { minLength: 1, maxLength: 20 },
          ),
          async (files) => {
            // Deduplicate paths to simulate real storage
            const unique = Array.from(new Map(files.map(f => [f.path, f])).values());

            // First run: nothing exists yet
            mockAdapter.listFiles.mockResolvedValue(unique);
            (prisma.song.findMany as jest.Mock).mockResolvedValue([]);
            (prisma.song.createMany as jest.Mock).mockResolvedValue({ count: unique.length });

            const first = await service.importFromS3();

            // Second run: all paths now "exist"
            mockAdapter.listFiles.mockResolvedValue(unique);
            (prisma.song.findMany as jest.Mock).mockResolvedValue(
              unique.map(f => ({ storagePath: f.path })),
            );
            (prisma.song.createMany as jest.Mock).mockResolvedValue({ count: 0 });

            const second = await service.importFromS3();

            expect(second.skipped).toBe(first.created);
            expect(second.created).toBe(0);
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  // Feature: music-streaming-app, Property 15: Import counts are accurate
  describe('Property 15: created + skipped === total audio files scanned', () => {
    it('counts always sum to total audio files', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              path: fc.uuid().map(id => `songs/${id}.mp3`),
              mimeType: fc.oneof(
                fc.constantFrom(...AUDIO_MIMES),
                fc.constantFrom(...NON_AUDIO_MIMES),
              ),
              size: fc.integer({ min: 1000, max: 5_000_000 }),
            }),
            { minLength: 0, maxLength: 30 },
          ),
          fc.array(fc.uuid().map(id => `songs/${id}.mp3`), { minLength: 0, maxLength: 10 }),
          async (files, existingPaths) => {
            const audioFiles = files.filter(f => AUDIO_MIMES.includes(f.mimeType));

            mockAdapter.listFiles.mockResolvedValue(files);
            (prisma.song.findMany as jest.Mock).mockResolvedValue(
              existingPaths.map(p => ({ storagePath: p })),
            );
            (prisma.song.createMany as jest.Mock).mockResolvedValue({ count: 0 });

            const result = await service.importFromS3();

            expect(result.created + result.skipped).toBe(audioFiles.length);
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  // Feature: music-streaming-app, Property 16: Unavailable storage backend aborts import
  describe('Property 16: storage unavailable → 502, no DB changes', () => {
    it('throws BadGatewayException and never calls createMany', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string(),
          async (_errorMsg) => {
            mockAdapter.listFiles.mockRejectedValue(new Error('Connection refused'));
            (prisma.song.createMany as jest.Mock).mockClear();

            await expect(service.importFromS3()).rejects.toThrow(BadGatewayException);
            expect(prisma.song.createMany).not.toHaveBeenCalled();
          },
        ),
        { numRuns: 20 },
      );
    });
  });
});
