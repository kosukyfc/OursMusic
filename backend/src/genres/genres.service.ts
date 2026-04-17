import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GenresService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.genre.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { songs: true, artists: true } },
      },
    });
  }

  async findById(id: string) {
    return this.prisma.genre.findUnique({
      where: { id },
      include: {
        songs: {
          include: { song: true },
        },
        artists: {
          include: { artist: true },
        },
        _count: { select: { songs: true, artists: true } },
      },
    });
  }

  async findByName(name: string) {
    return this.prisma.genre.findUnique({ where: { name } });
  }

  async create(data: { name: string; description?: string; coverUrl?: string }) {
    return this.prisma.genre.create({
      data,
    });
  }

  async update(id: string, data: { name?: string; description?: string; coverUrl?: string }) {
    return this.prisma.genre.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    return this.prisma.genre.delete({ where: { id } });
  }

  async getSongsByGenre(genreId: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [genreSongs, total] = await Promise.all([
      this.prisma.genreSong.findMany({
        where: { genreId },
        include: { song: true },
        skip,
        take: limit,
        orderBy: { song: { playCount: 'desc' } },
      }),
      this.prisma.genreSong.count({ where: { genreId } }),
    ]);
    return {
      songs: genreSongs.map(gs => gs.song),
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  async getSongsByGenreName(genreName: string, page = 1, limit = 50) {
    const genre = await this.findByName(genreName);
    if (!genre) return { songs: [], total: 0, page, limit, pages: 0 };
    return this.getSongsByGenre(genre.id, page, limit);
  }

  async addSongToGenre(genreId: string, songId: string) {
    return this.prisma.genreSong.create({
      data: { genreId, songId },
    });
  }

  async removeSongFromGenre(genreId: string, songId: string) {
    return this.prisma.genreSong.delete({
      where: { genreId_songId: { genreId, songId } },
    });
  }

  async getSongGenres(songId: string) {
    const genreSongs = await this.prisma.genreSong.findMany({
      where: { songId },
      include: { genre: true },
    });
    return genreSongs.map(gs => gs.genre);
  }
}
