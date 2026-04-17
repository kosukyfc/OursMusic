import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(q: string) {
    if (!q || q.trim().length === 0) {
      throw new BadRequestException('Search query cannot be empty');
    }

    const term = q.trim();

    const [songs, playlists, users] = await Promise.all([
      // Músicas: título, artista, álbum
      this.prisma.song.findMany({
        where: {
          available: true,
          OR: [
            { title:     { contains: term, mode: 'insensitive' } },
            { artist:    { contains: term, mode: 'insensitive' } },
            { albumName: { contains: term, mode: 'insensitive' } },
          ],
        },
        take: 50,
        orderBy: { playCount: 'desc' },
      }),

      // Playlists públicas
      this.prisma.playlist.findMany({
        where: {
          isPublic: true,
          title: { contains: term, mode: 'insensitive' },
        },
        take: 20,
        include: {
          user: { select: { id: true, name: true, username: true, avatarUrl: true } },
          _count: { select: { songs: true } },
        },
      }),

      // Usuários: nome ou username
      this.prisma.user.findMany({
        where: {
          OR: [
            { name:     { contains: term, mode: 'insensitive' } },
            { username: { contains: term, mode: 'insensitive' } },
          ],
        },
        take: 20,
        select: {
          id: true, name: true, username: true, avatarUrl: true, plan: true,
          _count: { select: { followers: true } },
        },
      }),
    ]);

    // Artistas únicos extraídos das músicas
    const artistMap = new Map<string, { name: string; coverUrl: string | null; playCount: number; songCount: number }>();
    for (const s of songs) {
      if (!s.artist) continue;
      const key = s.artist.toLowerCase();
      if (artistMap.has(key)) {
        const artist = artistMap.get(key)!;
        artist.playCount += s.playCount;
        artist.songCount++;
      } else {
        artistMap.set(key, { name: s.artist, coverUrl: s.coverUrl ?? null, playCount: s.playCount, songCount: 1 });
      }
    }

    // Buscar artistas que contenham o termo
    const extraSongs = await this.prisma.song.findMany({
      where: {
        available: true,
        artist: { contains: term, mode: 'insensitive' },
      },
      take: 100,
      select: { artist: true, coverUrl: true, playCount: true },
    });
    for (const s of extraSongs) {
      if (!s.artist) continue;
      const key = s.artist.toLowerCase();
      if (!artistMap.has(key)) {
        artistMap.set(key, { name: s.artist, coverUrl: s.coverUrl ?? null, playCount: s.playCount, songCount: 1 });
      } else {
        const artist = artistMap.get(key)!;
        artist.playCount += s.playCount;
        artist.songCount++;
      }
    }

    const artists = [...artistMap.values()]
      .sort((a, b) => b.playCount - a.playCount)
      .slice(0, 20);

    // Álbuns únicos extraídos das músicas
    const albumMap = new Map<string, { name: string; coverUrl: string | null; artist: string | null; songCount: number }>();
    for (const s of songs) {
      if (!s.albumName) continue;
      const key = s.albumName.toLowerCase();
      if (albumMap.has(key)) {
        albumMap.get(key)!.songCount++;
      } else {
        albumMap.set(key, { name: s.albumName, coverUrl: s.coverUrl ?? null, artist: s.artist ?? null, songCount: 1 });
      }
    }

    // Também busca álbuns cujo nome bate mas cujas músicas podem não ter aparecido
    const extraAlbumSongs = await this.prisma.song.findMany({
      where: {
        available: true,
        albumName: { contains: term, mode: 'insensitive' },
      },
      take: 100,
      select: { albumName: true, coverUrl: true, artist: true },
    });
    for (const s of extraAlbumSongs) {
      if (!s.albumName) continue;
      const key = s.albumName.toLowerCase();
      if (!albumMap.has(key)) {
        albumMap.set(key, { name: s.albumName, coverUrl: s.coverUrl ?? null, artist: s.artist ?? null, songCount: 1 });
      }
    }

    const albums = [...albumMap.values()];

    return { songs, albums, playlists, users, artists };
  }
}
