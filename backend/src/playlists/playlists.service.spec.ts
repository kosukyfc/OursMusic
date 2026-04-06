import * as fc from 'fast-check';
import { Test } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PlaylistsService } from './playlists.service';
import { PrismaService } from '../prisma/prisma.service';

function makePlaylist(overrides: Partial<{ id: string; userId: string; title: string }> = {}) {
  return { id: 'pl-1', userId: 'user-1', title: 'My Playlist', isPublic: false, ...overrides };
}

describe('PlaylistsService', () => {
  let service: PlaylistsService;
  let prisma: Record<string, any>;

  beforeEach(async () => {
    prisma = {
      playlist: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      playlistSong: {
        aggregate: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(async (ops: any[]) => Promise.all(ops)),
    };

    const module = await Test.createTestingModule({
      providers: [
        PlaylistsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(PlaylistsService);
  });

  // Feature: music-streaming-app, Property 17: Playlist ownership is enforced
  describe('Property 17: ownership enforced on update/delete', () => {
    it('returns 403 when a different user tries to modify the playlist', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.uuid(),
          async (ownerId, attackerId) => {
            fc.pre(ownerId !== attackerId);
            const playlist = makePlaylist({ userId: ownerId });
            prisma.playlist.findUnique.mockResolvedValue(playlist);

            await expect(service.update(playlist.id, attackerId, { title: 'Hacked' }))
              .rejects.toThrow(ForbiddenException);
            await expect(service.remove(playlist.id, attackerId))
              .rejects.toThrow(ForbiddenException);
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  // Feature: music-streaming-app, Property 18: Song position auto-increments on playlist append
  describe('Property 18: position = MAX(position) + 1', () => {
    it('new song gets position equal to previous max + 1', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 1000 }),
          async (currentMax) => {
            const playlist = makePlaylist();
            prisma.playlist.findUnique.mockResolvedValue(playlist);
            prisma.playlistSong.aggregate.mockResolvedValue({ _max: { position: currentMax } });
            prisma.playlistSong.create.mockImplementation(({ data }: any) =>
              Promise.resolve(data),
            );

            const result = await service.addSong(playlist.id, playlist.userId, 'song-1');
            expect(result.position).toBe(currentMax + 1);
          },
        ),
        { numRuns: 50 },
      );
    });

    it('first song gets position 0 when playlist is empty', async () => {
      const playlist = makePlaylist();
      prisma.playlist.findUnique.mockResolvedValue(playlist);
      prisma.playlistSong.aggregate.mockResolvedValue({ _max: { position: null } });
      prisma.playlistSong.create.mockImplementation(({ data }: any) => Promise.resolve(data));

      const result = await service.addSong(playlist.id, playlist.userId, 'song-1');
      expect(result.position).toBe(0);
    });
  });

  // Feature: music-streaming-app, Property 19: Playlist reorder is atomic and complete
  describe('Property 19: reorder updates all positions atomically', () => {
    it('calls $transaction with one update per song', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({ songId: fc.uuid(), position: fc.integer({ min: 0, max: 100 }) }),
            { minLength: 1, maxLength: 20 },
          ),
          async (songs) => {
            const playlist = makePlaylist();
            prisma.playlist.findUnique.mockResolvedValue(playlist);
            prisma.playlistSong.update.mockResolvedValue({});
            prisma.$transaction.mockImplementation(async (ops: any[]) => Promise.all(ops));

            await service.reorder(playlist.id, playlist.userId, songs);

            expect(prisma.$transaction).toHaveBeenCalledTimes(1);
            // Each song should have triggered one update call
            expect(prisma.playlistSong.update).toHaveBeenCalledTimes(songs.length);
            prisma.playlistSong.update.mockClear();
            prisma.$transaction.mockClear();
          },
        ),
        { numRuns: 30 },
      );
    });
  });

  // Feature: music-streaming-app, Property 20: Playlist deletion removes all associated records
  describe('Property 20: delete cascades to playlist_songs', () => {
    it('calls prisma.playlist.delete (cascade handled by DB constraint)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          async (playlistId) => {
            const playlist = makePlaylist({ id: playlistId });
            prisma.playlist.findUnique.mockResolvedValue(playlist);
            prisma.playlist.delete.mockResolvedValue(playlist);

            await service.remove(playlistId, playlist.userId);
            expect(prisma.playlist.delete).toHaveBeenCalledWith({ where: { id: playlistId } });
            prisma.playlist.delete.mockClear();
          },
        ),
        { numRuns: 30 },
      );
    });
  });
});
