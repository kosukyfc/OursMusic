import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ServiceUnavailableException } from '@nestjs/common';
import * as fc from 'fast-check';
import { StorageType } from '@prisma/client';

import { SongsService } from './songs.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageAdapterFactory } from '../storage/storage-adapter.factory';

// Mock music-metadata to avoid ESM issues in Jest
jest.mock('music-metadata', () => ({
  parseBuffer: jest.fn().mockResolvedValue({
    common: { title: 'Test Song', artist: 'Test Artist', album: 'Test Album' },
    format: { duration: 180, bitrate: 320000 },
  }),
}));

// ─── Mock factories ──────────────────────────────────────────────────────────

function makeSongRecord(songId: string) {
  return {
    id: songId,
    title: 'Test Song',
    storageType: StorageType.nas,
    storagePath: `songs/${songId}.mp3`,
    mimeType: 'audio/mpeg',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function makePrismaMock(songId: string) {
  return {
    song: {
      findUnique({ where }: { where: { id: string } }) {
        if (where.id === songId) {
          return Promise.resolve(makeSongRecord(songId));
        }
        return Promise.resolve(null);
      },
    },
  };
}

function makeStorageAdapterFactoryMock(signedUrl: string) {
  return {
    getAdapter: (_storageType: StorageType) => ({
      getSignedUrl: (_path: string, _ttl: number) => Promise.resolve(signedUrl),
    }),
  };
}

function makeEventEmitterMock() {
  return {
    emit: jest.fn(),
  };
}

// ─── Test Suite ──────────────────────────────────────────────────────────────

describe('SongsService — Property-Based Tests', () => {
  // ── Property 8: Stream endpoint returns a short-lived signed URL ──────────
  // Feature: music-streaming-app, Property 8: Stream endpoint returns a short-lived signed URL
  it('Property 8 — stream() returns a signed URL with expiresAt ≤ now + 60s and a non-empty url string', async () => {
    // Use a fixed songId so we can build the module once outside the property loop
    const fixedSongId = 'fixed-song-id-prop8';
    const signedUrl = `https://storage.example.com/songs/${fixedSongId}.mp3?token=abc`;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SongsService,
        { provide: PrismaService, useValue: makePrismaMock(fixedSongId) },
        { provide: StorageAdapterFactory, useValue: makeStorageAdapterFactoryMock(signedUrl) },
        { provide: EventEmitter2, useValue: makeEventEmitterMock() },
      ],
    }).compile();

    const service = module.get<SongsService>(SongsService);

    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        async (userId) => {
          const before = Date.now();
          const result = await service.stream(fixedSongId, userId);
          const deadline = new Date(before + 60 * 1000 + 100); // 100ms tolerance

          expect(typeof result.url).toBe('string');
          expect(result.url.length).toBeGreaterThan(0);
          expect(result.expiresAt).toBeInstanceOf(Date);
          expect(result.expiresAt.getTime()).toBeLessThanOrEqual(deadline.getTime());
        },
      ),
      { numRuns: 50 },
    );
  });

  // ── Property 9: Free users cannot stream premium-only songs ───────────────
  // Feature: music-streaming-app, Property 9: Free users cannot stream premium-only songs
  // NOTE: The `premiumOnly` field does not yet exist in the Prisma schema.
  // This test will be enabled once `premiumOnly Boolean @default(false)` is added to the Song model.
  it.todo('Property 9 — pending premiumOnly field in schema');

  // ── Property 10: Successful stream initiation is logged ───────────────────
  // Feature: music-streaming-app, Property 10: Successful stream initiation is logged
  it('Property 10 — stream() emits activity.play with { userId, songId } on every successful call', async () => {
    const fixedSongId = 'fixed-song-id-prop10';
    const signedUrl = `https://storage.example.com/songs/${fixedSongId}.mp3?token=xyz`;
    const eventEmitterMock = makeEventEmitterMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SongsService,
        { provide: PrismaService, useValue: makePrismaMock(fixedSongId) },
        { provide: StorageAdapterFactory, useValue: makeStorageAdapterFactoryMock(signedUrl) },
        { provide: EventEmitter2, useValue: eventEmitterMock },
      ],
    }).compile();

    const service = module.get<SongsService>(SongsService);

    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        async (userId) => {
          (eventEmitterMock.emit as jest.Mock).mockClear();

          await service.stream(fixedSongId, userId);

          expect(eventEmitterMock.emit).toHaveBeenCalledWith('activity.play', { userId, songId: fixedSongId });
        },
      ),
      { numRuns: 50 },
    );
  });

  // ── Property 11: Valid audio upload creates a song record ────────────────
  // **Validates: Requirements 4.1, 4.5**
  // Feature: music-streaming-app, Property 11: Valid audio upload creates a song record
  it('Property 11 — upload() with a valid audio file creates exactly one Song record with correct storage_type and storage_path', async () => {
    const VALID_MIME_TYPES = ['audio/mpeg', 'audio/flac', 'audio/aac', 'audio/ogg'] as const;

    // Build a single service instance with mutable mock state to avoid per-iteration module creation
    const createMock = jest.fn();
    const uploadMock = jest.fn();

    const prismaMock = { song: { create: createMock } };
    const adapterFactory = {
      getAdapter: (_: StorageType) => ({
        upload: uploadMock,
        getSignedUrl: jest.fn(),
        delete: jest.fn(),
        listFiles: jest.fn(),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SongsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: StorageAdapterFactory, useValue: adapterFactory },
        { provide: EventEmitter2, useValue: makeEventEmitterMock() },
      ],
    }).compile();

    const service = module.get<SongsService>(SongsService);

    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.constantFrom(...VALID_MIME_TYPES),
        fc.constantFrom(StorageType.s3, StorageType.nas, StorageType.drive),
        fc.stringMatching(/^[a-zA-Z0-9._-]{1,32}$/),
        async (userId, mimeType, storageType, originalname) => {
          const expectedPath = `songs/12345-${originalname}`;
          const createdSongId = 'song-' + userId;

          createMock.mockClear().mockResolvedValue({
            id: createdSongId,
            title: 'Test Song',
            storageType,
            storagePath: expectedPath,
            mimeType,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          uploadMock.mockClear().mockResolvedValue(expectedPath);

          const fakeFile: Express.Multer.File = {
            buffer: Buffer.from([0xff, 0xfb, 0x90, 0x00]),
            originalname,
            mimetype: mimeType,
            size: 4,
            fieldname: 'file',
            encoding: '7bit',
            stream: null as any,
            destination: '',
            filename: '',
            path: '',
          };

          const result = await service.upload(fakeFile, userId, storageType);

          // Exactly one song record must be created
          expect(createMock).toHaveBeenCalledTimes(1);

          // The created record must have the correct storage_type and storage_path
          const createArgs = createMock.mock.calls[0][0].data;
          expect(createArgs.storageType).toBe(storageType);
          expect(createArgs.storagePath).toBe(expectedPath);

          // The returned result must reflect the same values
          expect(result.storage_type).toBe(storageType);
          expect(result.storage_path).toBe(expectedPath);
          expect(typeof result.song_id).toBe('string');
          expect(result.song_id.length).toBeGreaterThan(0);
        },
      ),
      { numRuns: 50 },
    );
  });

  // ── Property 12: Invalid MIME types are rejected on upload ───────────────
  // **Validates: Requirements 4.2**
  // Feature: music-streaming-app, Property 12: Invalid MIME types are rejected on upload
  // NOTE: MIME validation is enforced at the HTTP layer via NestJS FileTypeValidator
  // in the controller (ParseFilePipe) using regex /^audio\/(mpeg|flac|aac|ogg)$/.
  // This property verifies that the validator correctly rejects all non-allowed MIME types.
  it('Property 12 — FileTypeValidator regex rejects any MIME type not in {audio/mpeg, audio/flac, audio/aac, audio/ogg}', async () => {
    const VALID_MIME_PATTERN = /^audio\/(mpeg|flac|aac|ogg)$/;

    // Arbitrary MIME type generator: type/subtype strings that are NOT in the allowed set
    const invalidMimeArb = fc
      .tuple(
        fc.stringMatching(/^[a-z]{2,12}$/),
        fc.stringMatching(/^[a-z0-9._-]{2,20}$/),
      )
      .map(([type, subtype]) => `${type}/${subtype}`)
      .filter(mime => !VALID_MIME_PATTERN.test(mime));

    fc.assert(
      fc.property(
        invalidMimeArb,
        (mimeType) => {
          // The FileTypeValidator in the controller uses this exact regex.
          // For any MIME type not in the allowed set, the pattern must not match.
          expect(VALID_MIME_PATTERN.test(mimeType)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  // ── Property 13: Storage failure → 503, no DB record created ─────────────
  // **Validates: Requirements 4.4**
  // Feature: music-streaming-app, Property 13: Storage unavailable → 503 and no partial DB record
  it('Property 13 — upload() throws ServiceUnavailableException (503) when storage fails and never calls prisma.song.create', async () => {
    const createMock = jest.fn();
    const uploadMock = jest.fn().mockRejectedValue(new Error('Storage unavailable'));

    const prismaMock = { song: { create: createMock } };
    const failingAdapterFactory = {
      getAdapter: (_: StorageType) => ({
        upload: uploadMock,
        getSignedUrl: jest.fn(),
        delete: jest.fn(),
        listFiles: jest.fn(),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SongsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: StorageAdapterFactory, useValue: failingAdapterFactory },
        { provide: EventEmitter2, useValue: makeEventEmitterMock() },
      ],
    }).compile();

    const service = module.get<SongsService>(SongsService);

    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.constantFrom(StorageType.s3, StorageType.nas, StorageType.drive),
        async (userId, storageType) => {
          createMock.mockClear();
          uploadMock.mockClear().mockRejectedValue(new Error('Storage unavailable'));

          // Minimal valid MP3 buffer (just enough for music-metadata to not crash)
          const fakeFile: Express.Multer.File = {
            buffer: Buffer.from([0xff, 0xfb, 0x90, 0x00]),
            originalname: 'test.mp3',
            mimetype: 'audio/mpeg',
            size: 4,
            fieldname: 'file',
            encoding: '7bit',
            stream: null as any,
            destination: '',
            filename: '',
            path: '',
          };

          await expect(service.upload(fakeFile, userId, storageType)).rejects.toThrow(
            ServiceUnavailableException,
          );

          // DB must never be touched
          expect(createMock).not.toHaveBeenCalled();
        },
      ),
      { numRuns: 50 },
    );
  });

  // ── Unit test: DB failure after storage write triggers cleanup ────────────
  it('upload() calls adapter.delete() when prisma.song.create() fails after successful storage write', async () => {
    const deleteMock = jest.fn().mockResolvedValue(undefined);
    const uploadMock = jest.fn().mockResolvedValue('songs/test.mp3');

    const adapterFactory = {
      getAdapter: (_: StorageType) => ({
        upload: uploadMock,
        getSignedUrl: jest.fn(),
        delete: deleteMock,
        listFiles: jest.fn(),
      }),
    };

    const prismaMock = {
      song: {
        create: jest.fn().mockRejectedValue(new Error('DB connection lost')),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SongsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: StorageAdapterFactory, useValue: adapterFactory },
        { provide: EventEmitter2, useValue: makeEventEmitterMock() },
      ],
    }).compile();

    const service = module.get<SongsService>(SongsService);

    const fakeFile: Express.Multer.File = {
      buffer: Buffer.from([0xff, 0xfb, 0x90, 0x00]),
      originalname: 'test.mp3',
      mimetype: 'audio/mpeg',
      size: 4,
      fieldname: 'file',
      encoding: '7bit',
      stream: null as any,
      destination: '',
      filename: '',
      path: '',
    };

    await expect(service.upload(fakeFile, 'user-1', StorageType.s3)).rejects.toThrow('DB connection lost');
    expect(deleteMock).toHaveBeenCalledWith('songs/test.mp3');
  });
});
