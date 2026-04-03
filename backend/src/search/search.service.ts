import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * GET /search?q=
   * ILIKE query on songs, albums, artists.
   * Empty query → 400.
   * Property 28: every result contains the query string (case-insensitive).
   */
  async search(q: string) {
    if (!q || q.trim().length === 0) {
      throw new BadRequestException('Search query cannot be empty');
    }

    const [songs, albums, artists] = await Promise.all([
      this.prisma.song.findMany({
        where: { title: { contains: q, mode: 'insensitive' } },
        take: 50,
      }),
      this.prisma.album.findMany({
        where: { title: { contains: q, mode: 'insensitive' } },
        take: 50,
        include: { artist: true },
      }),
      this.prisma.artist.findMany({
        where: { name: { contains: q, mode: 'insensitive' } },
        take: 50,
      }),
    ]);

    return { songs, albums, artists };
  }
}
