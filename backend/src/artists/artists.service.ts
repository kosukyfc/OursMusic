import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ArtistsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Obter perfil completo de um artista com estatísticas
   */
  async getArtistProfile(artistName: string, userId?: string) {
    // Buscar todas as músicas com esse nome de artista
    const songs = await this.prisma.song.findMany({
      where: { artist: { equals: artistName, mode: 'insensitive' } },
      select: {
        id: true,
        title: true,
        albumName: true,
        coverUrl: true,
        duration: true,
        playCount: true,
        genre: true,
        createdAt: true,
      },
      orderBy: { playCount: 'desc' },
      take: 500,
    });

    if (songs.length === 0) {
      return null;
    }

    // Agrupar por álbum
    const albumMap = new Map<string, any>();
    const topSongs = songs.slice(0, 10);
    
    for (const song of songs) {
      const albumName = song.albumName || 'Unknown Album';
      if (!albumMap.has(albumName)) {
        albumMap.set(albumName, {
          name: albumName,
          coverUrl: song.coverUrl,
          songs: [],
          playCount: 0,
        });
      }
      const album = albumMap.get(albumName)!;
      album.songs.push(song);
      album.playCount += song.playCount;
    }

    const albums = Array.from(albumMap.values())
      .sort((a, b) => b.playCount - a.playCount);

    // Calcular estatísticas
    const totalPlays = songs.reduce((sum, s) => sum + s.playCount, 0);
    const totalDuration = songs.reduce((sum, s) => sum + s.duration, 0);
    const genres = [...new Set(songs.map(s => s.genre).filter(Boolean))];

    // Verificar se usuário segue este artista
    let isFollowing = false;
    if (userId) {
      // Usar a tabela Follow para artistas (por nome)
      // Como não temos uma tabela ArtistFollow, vamos usar um padrão com prefixo
      const artistFollowId = `artist:${artistName}`;
      const follow = await this.prisma.follow.findFirst({
        where: {
          followerId: userId,
          followingId: artistFollowId,
        },
      });
      isFollowing = !!follow;
    }

    return {
      name: artistName,
      totalSongs: songs.length,
      totalPlays,
      totalDuration: Math.round(totalDuration / 60),
      topSongs,
      albums,
      genres,
      isFollowing,
      followers: 0, // TODO: implementar contagem real de seguidores
    };
  }

  /**
   * Buscar artistas por nome
   */
  async searchArtists(query: string, limit = 20) {
    const songs = await this.prisma.song.findMany({
      where: {
        artist: {
          contains: query,
          mode: 'insensitive',
        },
      },
      select: {
        artist: true,
        coverUrl: true,
        playCount: true,
      },
      distinct: ['artist'],
      take: limit,
    });

    // Agrupar e calcular estatísticas
    const artistMap = new Map<string, any>();
    for (const song of songs) {
      if (!song.artist) continue;
      if (!artistMap.has(song.artist)) {
        artistMap.set(song.artist, {
          name: song.artist,
          coverUrl: song.coverUrl,
          playCount: 0,
        });
      }
      const artist = artistMap.get(song.artist)!;
      artist.playCount += song.playCount;
    }

    return Array.from(artistMap.values())
      .sort((a, b) => b.playCount - a.playCount);
  }

  /**
   * Seguir um artista
   */
  async followArtist(userId: string, artistName: string) {
    const artistFollowId = `artist:${artistName}`;
    
    return this.prisma.follow.create({
      data: {
        followerId: userId,
        followingId: artistFollowId,
      },
    }).catch(() => null); // Já existe
  }

  /**
   * Deixar de seguir um artista
   */
  async unfollowArtist(userId: string, artistName: string) {
    const artistFollowId = `artist:${artistName}`;
    
    return this.prisma.follow.deleteMany({
      where: {
        followerId: userId,
        followingId: artistFollowId,
      },
    });
  }

  /**
   * Obter artistas mais populares
   */
  async getTopArtists(limit = 50) {
    const songs = await this.prisma.song.findMany({
      where: { artist: { not: null } },
      select: {
        artist: true,
        coverUrl: true,
        playCount: true,
      },
      take: 1000,
    });

    const artistMap = new Map<string, any>();
    for (const song of songs) {
      if (!song.artist) continue;
      if (!artistMap.has(song.artist)) {
        artistMap.set(song.artist, {
          name: song.artist,
          coverUrl: song.coverUrl,
          playCount: 0,
          songCount: 0,
        });
      }
      const artist = artistMap.get(song.artist)!;
      artist.playCount += song.playCount;
      artist.songCount++;
    }

    return Array.from(artistMap.values())
      .sort((a, b) => b.playCount - a.playCount)
      .slice(0, limit);
  }
}
