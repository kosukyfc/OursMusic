import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { StorageAdapterFactory } from '../storage/storage-adapter.factory';
import { StorageType } from '@prisma/client';
import { Metadata } from './metadata.types';
import { parseMetadata } from './metadata.parser';

export type SongMetadata = Metadata;

export interface StreamResult {
  url: string;
  expiresAt: Date;
}

@Injectable()
export class SongsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageAdapterFactory: StorageAdapterFactory,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async list(uploadedBy?: string) {
    return this.prisma.song.findMany({
      where: uploadedBy ? { uploadedBy } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  async homeData(_userId: string) {
    const allSongs = await this.prisma.song.findMany({
      where: { available: true },
      orderBy: { playCount: 'desc' },
      select: {
        id: true, title: true, artist: true, albumName: true,
        coverUrl: true, duration: true, available: true, playCount: true, genre: true,
      },
    });

    const usedIds = new Set<string>();
    const carousels: { genre: string; songs: typeof allSongs }[] = [];

    // 1. Group by genre (real genres first)
    const genreMap = new Map<string, typeof allSongs>();
    for (const s of allSongs) {
      const g = s.genre?.trim();
      if (!g) continue;
      if (!genreMap.has(g)) genreMap.set(g, []);
      genreMap.get(g)!.push(s);
    }
    const sortedGenres = [...genreMap.entries()]
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 6);

    for (const [genre, songs] of sortedGenres) {
      const fresh = songs.filter(s => !usedIds.has(s.id)).slice(0, 6);
      if (fresh.length === 0) continue;
      fresh.forEach(s => usedIds.add(s.id));
      carousels.push({ genre, songs: fresh });
    }

    // 2. Fallback: if fewer than 6 carousels, fill with albums
    if (carousels.length < 6) {
      const albumMap = new Map<string, typeof allSongs>();
      for (const s of allSongs) {
        if (usedIds.has(s.id)) continue;
        const key = s.albumName?.trim();
        if (!key) continue;
        if (!albumMap.has(key)) albumMap.set(key, []);
        albumMap.get(key)!.push(s);
      }
      const sortedAlbums = [...albumMap.entries()]
        .sort((a, b) => b[1].length - a[1].length);
      for (const [album, songs] of sortedAlbums) {
        if (carousels.length >= 6) break;
        const fresh = songs.filter(s => !usedIds.has(s.id)).slice(0, 6);
        if (fresh.length < 2) continue;
        fresh.forEach(s => usedIds.add(s.id));
        carousels.push({ genre: album, songs: fresh });
      }
    }

    // 3. Fallback: fill remaining with artists
    if (carousels.length < 6) {
      const artistMap = new Map<string, typeof allSongs>();
      for (const s of allSongs) {
        if (usedIds.has(s.id)) continue;
        const key = s.artist?.trim();
        if (!key) continue;
        if (!artistMap.has(key)) artistMap.set(key, []);
        artistMap.get(key)!.push(s);
      }
      const sortedArtists = [...artistMap.entries()]
        .sort((a, b) => b[1].length - a[1].length);
      for (const [artist, songs] of sortedArtists) {
        if (carousels.length >= 6) break;
        const fresh = songs.filter(s => !usedIds.has(s.id)).slice(0, 6);
        if (fresh.length < 2) continue;
        fresh.forEach(s => usedIds.add(s.id));
        carousels.push({ genre: artist, songs: fresh });
      }
    }

    // 4. Last resort: if still empty, just show all songs in one carousel
    if (carousels.length === 0 && allSongs.length > 0) {
      carousels.push({ genre: 'Músicas', songs: allSongs.slice(0, 6) });
    }

    // Top albums
    const albumAgg = await this.prisma.song.groupBy({
      by: ['albumName'],
      where: { albumName: { not: null }, available: true },
      _sum: { playCount: true },
      _count: { id: true },
      take: 20,
    });
    const topAlbums = albumAgg
      .filter(a => a.albumName)
      .sort((a, b) => (b._sum.playCount ?? 0) - (a._sum.playCount ?? 0))
      .slice(0, 6)
      .map(a => {
        const cover = allSongs.find(s => s.albumName === a.albumName)?.coverUrl ?? null;
        return { name: a.albumName!, coverUrl: cover, playCount: a._sum.playCount ?? 0, songCount: a._count.id };
      });

    // Top playlists
    const topPlaylists = await this.prisma.playlist.findMany({
      where: { isPublic: true },
      include: { songs: { include: { song: { select: { coverUrl: true } } }, take: 1 } },
      take: 20,
    });
    const sortedPlaylists = topPlaylists
      .sort((a, b) => b.songs.length - a.songs.length)
      .slice(0, 6);

    // Top artists
    const artistAgg = await this.prisma.song.groupBy({
      by: ['artist'],
      where: { artist: { not: null }, available: true },
      _sum: { playCount: true },
      take: 20,
    });
    const topArtists = artistAgg
      .filter(a => a.artist)
      .sort((a, b) => (b._sum.playCount ?? 0) - (a._sum.playCount ?? 0))
      .slice(0, 6)
      .map(a => {
        const cover = allSongs.find(s => s.artist === a.artist)?.coverUrl ?? null;
        return { name: a.artist!, coverUrl: cover, playCount: a._sum.playCount ?? 0 };
      });

    return {
      carousels,
      topAlbums,
      topPlaylists: sortedPlaylists.map(p => ({
        id: p.id,
        title: p.title,
        coverUrl: p.songs[0]?.song?.coverUrl ?? null,
        songCount: p.songs.length,
      })),
      topArtists,
    };
  }

  async getLyrics(songId: string) {
    const song = await this.prisma.song.findUnique({
      where: { id: songId },
      select: { lyrics: true, lyricsSynced: true, title: true, artist: true },
    });
    if (!song) throw new NotFoundException('Song not found');
    return {
      lyrics: song.lyrics,
      lyricsSynced: song.lyricsSynced,
      hasSynced: !!song.lyricsSynced,
    };
  }

  async stream(songId: string, userId: string): Promise<StreamResult> {
    const song = await this.prisma.song.findUnique({ where: { id: songId } });
    if (!song) throw new NotFoundException(`Song ${songId} not found`);

    if (song.storageType === StorageType.drive) {
      throw new NotFoundException('This song was stored on Google Drive and is no longer available. Please re-import it.');
    }

    const adapter = this.storageAdapterFactory.getAdapter(song.storageType);
    const url = await adapter.getSignedUrl(song.storagePath, 3600);

    this.eventEmitter.emit('activity.play', { userId, songId });

    return { url, expiresAt: new Date(Date.now() + 3600 * 1000) };
  }

  async upload(
    file: Express.Multer.File,
    userId: string,
    storageType: StorageType,
  ): Promise<{ song_id: string; storage_type: StorageType; storage_path: string }> {
    const metadata = await parseMetadata(file);
    const adapter = this.storageAdapterFactory.getAdapter(storageType);

    let storagePath: string;
    try {
      storagePath = await adapter.upload(
        file.buffer,
        `songs/${Date.now()}-${file.originalname}`,
        file.mimetype,
      );
    } catch {
      throw new ServiceUnavailableException('Storage backend unavailable');
    }

    const song = await this.prisma.song.create({
      data: {
        title: metadata.title,
        artist: metadata.artist !== 'Unknown Artist' ? metadata.artist : null,
        albumName: metadata.album !== 'Unknown Album' ? metadata.album : null,
        duration: metadata.duration,
        bitrate: metadata.bitrate,
        storageType,
        storagePath,
        fileSize: BigInt(file.size),
        mimeType: file.mimetype,
        uploadedBy: userId,
      },
    });

    return { song_id: song.id, storage_type: song.storageType, storage_path: song.storagePath };
  }
}
